import fs from 'node:fs/promises'
import { logger } from '@libp2p/logger'
import { execa, type ExecaChildProcess } from 'execa'
import mergeOptions from 'merge-options'
import pDefer from 'p-defer'
import waitFor from 'p-wait-for'
import { checkForRunningApi, tmpDir, buildStartArgs, repoExists, buildInitArgs } from './utils.js'
import type { KuboNode, KuboInfo, KuboInitOptions, KuboOptions, KuboStartOptions, KuboStopOptions } from './index.js'
import type { Logger } from '@libp2p/interface'
import type { KuboRPCClient } from 'kubo-rpc-client'

const merge = mergeOptions.bind({ ignoreUndefined: true })

function translateError (err: Error & { stdout: string, stderr: string }): Error {
  // get the actual error message to be the err.message
  err.message = `${err.stdout} \n\n ${err.stderr} \n\n ${err.message} \n\n`

  return err
}

/**
 * Node for daemon nodes
 */
export default class KuboDaemon implements KuboNode {
  public options: KuboOptions & Required<Pick<KuboOptions, 'rpc'>>

  private readonly disposable: boolean
  private subprocess?: ExecaChildProcess
  private _api?: KuboRPCClient
  private readonly repo: string
  private readonly stdout: Logger
  private readonly stderr: Logger
  private readonly _exec?: string
  private readonly env: Record<string, string>
  private readonly initArgs?: KuboInitOptions
  private readonly startArgs?: KuboStartOptions
  private readonly stopArgs?: KuboStopOptions

  constructor (options: KuboOptions) {
    if (options.rpc == null) {
      throw new Error('Please pass an rpc option')
    }

    // @ts-expect-error cannot detect rpc is present
    this.options = options
    this.repo = options.repo ?? tmpDir(options.type)
    this._exec = this.options.bin
    this.env = merge({
      IPFS_PATH: this.repo
    }, this.options.env)
    this.disposable = Boolean(this.options.disposable)

    this.stdout = logger('ipfsd-ctl:kubo:stdout')
    this.stderr = logger('ipfsd-ctl:kubo:stderr')

    if (options.init != null && typeof options.init !== 'boolean') {
      this.initArgs = options.init
    }

    if (options.start != null && typeof options.start !== 'boolean') {
      this.startArgs = options.start
    }

    if (options.stop != null) {
      this.stopArgs = options.stop
    }
  }

  get api (): KuboRPCClient {
    if (this._api == null) {
      throw new Error('Not started')
    }

    return this._api
  }

  get exec (): string {
    if (this._exec == null) {
      throw new Error('No executable specified')
    }

    return this._exec
  }

  async info (): Promise<KuboInfo> {
    const id = await this._api?.id()

    return {
      version: await this.getVersion(),
      pid: this.subprocess?.pid,
      peerId: id?.id.toString(),
      multiaddrs: (id?.addresses ?? []).map(ma => ma.toString()),
      api: checkForRunningApi(this.repo),
      repo: this.repo
    }
  }

  /**
   * Delete the repo that was being used. If the node was marked as disposable
   * this will be called automatically when the process is exited.
   */
  async cleanup (): Promise<void> {
    try {
      await fs.rm(this.repo, {
        recursive: true,
        force: true
      })
    } catch (err: any) {
      if (err.code !== 'EPERM') {
        throw err
      }
    }
  }

  async init (args?: KuboInitOptions): Promise<void> {
    // check if already initialized
    if (await repoExists(this.repo)) {
      return
    }

    const initOptions = {
      ...(this.initArgs ?? {}),
      ...(args ?? {})
    }

    if (this.options.test === true) {
      if (initOptions.profiles == null) {
        initOptions.profiles = []
      }

      if (!initOptions.profiles.includes('test')) {
        initOptions.profiles.push('test')
      }
    }

    const cliArgs = buildInitArgs(initOptions)

    const out = await execa(this.exec, cliArgs, {
      env: this.env
    })
      .catch(translateError)

    if (out instanceof Error) {
      throw out
    }

    const { stdout, stderr } = out

    this.stdout(stdout)
    this.stderr(stderr)

    await this._replaceConfig(merge(
      await this._getConfig(),
      initOptions.config
    ))
  }

  /**
   * Start the daemon
   */
  async start (args?: KuboStartOptions): Promise<void> {
    // Check if a daemon is already running
    const api = checkForRunningApi(this.repo)

    if (api != null) {
      this._api = this.options.rpc(api)
      return
    }

    const startOptions = {
      ...(this.startArgs ?? {}),
      ...(args ?? {})
    }

    const cliArgs = buildStartArgs(startOptions)

    let output = ''
    const deferred = pDefer()

    const out = this.subprocess = execa(this.exec, cliArgs, {
      env: this.env
    })

    if (out instanceof Error) {
      throw out
    }

    const { stdout, stderr } = out

    if (stderr == null || stdout == null) {
      throw new Error('stdout/stderr was not defined on subprocess')
    }

    stderr.on('data', data => {
      this.stderr(data.toString())
    })
    stdout.on('data', data => {
      this.stdout(data.toString())
    })

    const readyHandler = (data: Buffer): void => {
      output += data.toString()
      const apiMatch = output.trim().match(/API .*listening on:? (.*)/)

      if ((apiMatch != null) && apiMatch.length > 0) {
        this._api = this.options.rpc(apiMatch[1])
      }

      if (output.match(/(?:daemon is running|Daemon is ready)/) != null) {
        // we're good
        stdout.off('data', readyHandler)
        deferred.resolve()
      }
    }
    stdout.on('data', readyHandler)
    this.subprocess.catch(err => { deferred.reject(translateError(err)) })

    // remove listeners and clean up on process exit
    void this.subprocess.on('exit', () => {
      stderr.removeAllListeners()
      stdout.removeAllListeners()

      if (this.disposable) {
        this.cleanup().catch(() => {})
      }
    })

    await deferred.promise
  }

  async stop (options?: KuboStopOptions): Promise<void> {
    const stopOptions = {
      ...(this.stopArgs ?? {}),
      ...(options ?? {})
    }
    const timeout = stopOptions.forceKillTimeout ?? 1000
    const subprocess = this.subprocess

    if (subprocess == null || subprocess.exitCode != null || this._api == null) {
      return
    }

    if (!(await this.api.isOnline())) {
      return
    }

    await this.api.stop()

    try {
      // wait for the subprocess to exit and declare ourselves stopped
      await waitFor(() => subprocess.exitCode != null, {
        timeout
      })
    } catch {
      subprocess.kill('SIGKILL')
    }

    if (this.disposable) {
      // wait for the cleanup routine to run after the subprocess has exited
      await this.cleanup()
    }
  }

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   */
  async _getConfig (): Promise<any> {
    const contents = await fs.readFile(`${this.repo}/config`, {
      encoding: 'utf-8'
    })
    const config = JSON.parse(contents)

    if (this.options.test === true) {
      // use random ports for all addresses
      config.Addresses.Swarm = [
        '/ip4/127.0.0.1/tcp/0',
        '/ip4/127.0.0.1/tcp/0/ws',
        '/ip4/127.0.0.1/udp/0/quic-v1',
        '/ip4/127.0.0.1/udp/0/quic-v1/webtransport',
        '/ip4/127.0.0.1/tcp/0/webrtc-direct'
      ]
      config.Addresses.API = '/ip4/127.0.0.1/tcp/0'
      config.Addresses.Gateway = '/ip4/127.0.0.1/tcp/0'

      // configure CORS access for the http api
      config.API.HTTPHeaders = {
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['PUT', 'POST', 'GET']
      }
    }

    return config
  }

  /**
   * Replace the current config with the provided one
   */
  public async _replaceConfig (config: any): Promise<void> {
    await fs.writeFile(`${this.repo}/config`, JSON.stringify(config, null, 2), {
      encoding: 'utf-8'
    })
  }

  private async getVersion (): Promise<string> {
    if (this.exec == null) {
      throw new Error('No executable specified')
    }

    const out = await execa(this.exec, ['version'], {
      env: this.env
    })
      .catch(translateError)

    if (out instanceof Error) {
      throw out
    }

    const { stdout } = out

    return stdout.trim()
  }
}
