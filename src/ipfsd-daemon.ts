import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import fs from 'fs/promises'
import mergeOptions from 'merge-options'
import { logger } from '@libp2p/logger'
import { execa, ExecaChildProcess } from 'execa'
import { nanoid } from 'nanoid'
import path from 'path'
import os from 'os'
import { checkForRunningApi, repoExists, tmpDir, defaultRepo, buildInitArgs, buildStartArgs } from './utils.js'
import waitFor from 'p-wait-for'
import type { Controller, ControllerOptions, InitOptions, IPFSAPI, PeerData } from './index.js'

const merge = mergeOptions.bind({ ignoreUndefined: true })

const daemonLog = {
  info: logger('ipfsd-ctl:daemon:stdout'),
  err: logger('ipfsd-ctl:daemon:stderr')
}
const rpcModuleLogger = logger('ipfsd-ctl:daemon')

function translateError (err: Error & { stdout: string, stderr: string }) {
  // get the actual error message to be the err.message
  err.message = `${err.stdout} \n\n ${err.stderr} \n\n ${err.message} \n\n`

  return err
}

interface TranslateUnknownErrorArgs {
  err: Error | unknown
  stdout: string
  stderr: string
  nameFallback?: string
  messageFallback?: string
}

function translateUnknownError ({ err, stdout, stderr, nameFallback = 'Unknown Error', messageFallback = 'Unknown Error Message' }: TranslateUnknownErrorArgs) {
  const error: Error = err as Error
  const name = error?.name ?? nameFallback
  const message = error?.message ?? messageFallback
  return translateError({
    name,
    message,
    stdout,
    stderr
  })
}

/**
 * Controller for daemon nodes
 */
class Daemon implements Controller {
  public path: string
  // @ts-expect-error set during startup
  public api: IPFSAPI
  public subprocess?: ExecaChildProcess
  public opts: ControllerOptions
  public initialized: boolean
  public started: boolean
  public clean: boolean
  // @ts-expect-error set during startup
  public apiAddr: Multiaddr

  private gatewayAddr?: Multiaddr
  private grpcAddr?: Multiaddr
  private readonly exec?: string
  private readonly env: Record<string, string>
  private readonly disposable: boolean
  private _peerId: PeerData | null

  constructor (opts: ControllerOptions) {
    this.opts = opts
    this.path = this.opts.ipfsOptions?.repo ?? (opts.disposable === true ? tmpDir(opts.type) : defaultRepo(opts.type))
    this.exec = this.opts.ipfsBin
    this.env = merge({ IPFS_PATH: this.path }, this.opts.env)
    this.disposable = Boolean(this.opts.disposable)
    this.initialized = false
    this.started = false
    this.clean = true
    this._peerId = null
  }

  get peer () {
    if (this._peerId == null) {
      throw new Error('Not started')
    }

    return this._peerId
  }

  private _setApi (addr: string): void {
    this.apiAddr = multiaddr(addr)
  }

  private _setGrpc (addr: string): void {
    this.grpcAddr = multiaddr(addr)
  }

  private _setGateway (addr: string): void {
    this.gatewayAddr = multiaddr(addr)
  }

  _createApi () {
    if (this.opts.ipfsClientModule != null && this.grpcAddr != null) {
      this.api = this.opts.ipfsClientModule.create({
        grpc: this.grpcAddr,
        http: this.apiAddr
      })
    } else if (this.apiAddr != null) {
      if (this.opts.kuboRpcModule != null) {
        rpcModuleLogger('Using kubo-rpc-client')
        this.api = this.opts.kuboRpcModule.create(this.apiAddr)
      } else if (this.opts.ipfsHttpModule != null) {
        rpcModuleLogger('Using ipfs-http-client')
        this.api = this.opts.ipfsHttpModule.create(this.apiAddr)
      } else {
        throw new Error('You must pass either a kuboRpcModule or ipfsHttpModule')
      }
    }

    if (this.api == null) {
      throw new Error(`Could not create API from http '${this.apiAddr.toString()}' and/or gRPC '${this.grpcAddr?.toString() ?? 'undefined'}'`)
    }

    if (this.apiAddr != null) {
      this.api.apiHost = this.apiAddr.nodeAddress().address
      this.api.apiPort = this.apiAddr.nodeAddress().port
    }

    if (this.gatewayAddr != null) {
      this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
      this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
    }

    if (this.grpcAddr != null) {
      this.api.grpcHost = this.grpcAddr.nodeAddress().address
      this.api.grpcPort = this.grpcAddr.nodeAddress().port
    }
  }

  async init (initOptions: InitOptions = {}): Promise<Controller> {
    this.initialized = await repoExists(this.path)
    if (this.initialized) {
      this.clean = false
      return this
    }

    initOptions = merge({
      emptyRepo: false,
      profiles: this.opts.test === true ? ['test'] : []
    },
    typeof this.opts.ipfsOptions?.init === 'boolean' ? {} : this.opts.ipfsOptions?.init,
    typeof initOptions === 'boolean' ? {} : initOptions
    )

    const opts = merge(
      this.opts, {
        ipfsOptions: {
          init: initOptions
        }
      }
    )

    const args = buildInitArgs(opts)

    if (this.exec == null) {
      throw new Error('No executable specified')
    }

    const { stdout, stderr } = await execa(this.exec, args, {
      env: this.env
    })
      .catch(translateError)

    daemonLog.info(stdout)
    daemonLog.err(stderr)

    // default-config only for Go
    if (this.opts.type === 'go') {
      await this._replaceConfig(merge(
        await this._getConfig(),
        this.opts.ipfsOptions?.config
      ))
    }

    this.clean = false
    this.initialized = true

    return this
  }

  /**
   * Delete the repo that was being used. If the node was marked as disposable this will be called automatically when the process is exited.
   *
   * @returns {Promise<Daemon>}
   */
  async cleanup () {
    if (!this.clean) {
      await fs.rm(this.path, {
        recursive: true
      })
      this.clean = true
    }
    return this
  }

  /**
   * Start the daemon.
   *
   * @returns {Promise<Daemon>}
   */
  async start () {
    // Check if a daemon is already running
    const api = checkForRunningApi(this.path)

    if (api != null) {
      this._setApi(api)
      this._createApi()
    } else if (this.exec == null) {
      throw new Error('No executable specified')
    } else {
      const args = buildStartArgs(this.opts)

      let output = ''

      const ready = new Promise((resolve, reject) => {
        if (this.exec == null) {
          return reject(new Error('No executable specified'))
        }

        this.subprocess = execa(this.exec, args, {
          env: this.env
        })

        const { stdout, stderr } = this.subprocess

        if (stderr == null) {
          throw new Error('stderr was not defined on subprocess')
        }

        if (stdout == null) {
          throw new Error('stderr was not defined on subprocess')
        }

        stderr.on('data', data => daemonLog.err(data.toString()))
        stdout.on('data', data => daemonLog.info(data.toString()))

        const readyHandler = (data: Buffer) => {
          output += data.toString()
          const apiMatch = output.trim().match(/API .*listening on:? (.*)/)
          const gwMatch = output.trim().match(/Gateway .*listening on:? (.*)/)
          const grpcMatch = output.trim().match(/gRPC .*listening on:? (.*)/)

          if ((apiMatch != null) && apiMatch.length > 0) {
            this._setApi(apiMatch[1])
          }

          if ((gwMatch != null) && gwMatch.length > 0) {
            this._setGateway(gwMatch[1])
          }

          if ((grpcMatch != null) && grpcMatch.length > 0) {
            this._setGrpc(grpcMatch[1])
          }

          if (output.match(/(?:daemon is running|Daemon is ready)/) != null) {
            // we're good
            this._createApi()
            this.started = true
            stdout.off('data', readyHandler)
            resolve(this.api)
          }
        }
        stdout.on('data', readyHandler)
        this.subprocess.catch(err => reject(translateError(err)))
        void this.subprocess.on('exit', () => {
          this.started = false
          stderr.removeAllListeners()
          stdout.removeAllListeners()

          if (this.disposable) {
            this.cleanup().catch(() => {})
          }
        })
      })

      await ready
    }

    this.started = true
    // Add `peerId`
    const id = await this.api.id()
    this._peerId = id

    return this
  }

  async stop (options: { timeout?: number } = {}): Promise<Controller> {
    const timeout = options.timeout ?? 60000

    if (!this.started) {
      return this
    }

    if (this.subprocess != null) {
      /** @type {ReturnType<setTimeout> | undefined} */
      let killTimeout
      const subprocess = this.subprocess

      if (this.disposable) {
        // we're done with this node and will remove it's repo when we are done
        // so don't wait for graceful exit, just terminate the process
        this.subprocess.kill('SIGKILL')
      } else {
        if (this.opts.forceKill !== false) {
          killTimeout = setTimeout(() => {
            // eslint-disable-next-line no-console
            console.error(new Error(`Timeout stopping ${this.opts.type ?? 'unknown'} node after ${this.opts.forceKillTimeout ?? 'unknown'}ms. Process ${subprocess.pid ?? 'unknown'} will be force killed now.`))
            this.subprocess?.kill('SIGKILL')
          }, this.opts.forceKillTimeout)
        }

        this.subprocess.cancel()
      }

      // wait for the subprocess to exit and declare ourselves stopped
      await waitFor(() => !this.started, {
        timeout
      })

      if (killTimeout != null) {
        clearTimeout(killTimeout)
      }

      if (this.disposable) {
        // wait for the cleanup routine to run after the subprocess has exited
        await waitFor(() => this.clean, {
          timeout
        })
      }
    } else {
      await this.api.stop()

      this.started = false
    }

    return this
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {Promise<number>}
   */
  async pid () {
    if (this.subprocess?.pid != null) {
      return await Promise.resolve(this.subprocess?.pid)
    }
    throw new Error('Daemon process is not running.')
  }

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   *
   * @private
   * @param {string} [key] - A specific config to retrieve.
   * @returns {Promise<object | string>}
   */
  async _getConfig (key = 'show') {
    if (this.exec == null) {
      throw new Error('No executable specified')
    }

    const {
      stdout,
      stderr
    } = await execa(
      this.exec,
      ['config', key],
      {
        env: this.env
      })
      .catch(translateError)

    if (key === 'show') {
      try {
        return JSON.parse(stdout)
      } catch (err) {
        throw translateUnknownError({
          err,
          stderr,
          stdout,
          nameFallback: 'JSON.parse error',
          messageFallback: 'Failed to parse stdout as JSON'
        })
      }
    }

    return stdout.trim()
  }

  /**
   * Replace the current config with the provided one
   */
  private async _replaceConfig (config: any): Promise<Controller> {
    if (this.exec == null) {
      throw new Error('No executable specified')
    }

    const tmpFile = path.join(os.tmpdir(), nanoid())

    await fs.writeFile(tmpFile, JSON.stringify(config))
    await execa(
      this.exec,
      ['config', 'replace', `${tmpFile}`],
      { env: this.env }
    )
      .catch(translateError)
    await fs.unlink(tmpFile)

    return this
  }

  async version (): Promise<string> {
    if (this.exec == null) {
      throw new Error('No executable specified')
    }

    const {
      stdout
    } = await execa(this.exec, ['version'], {
      env: this.env
    })
      .catch(translateError)

    return stdout.trim()
  }
}

export default Daemon
