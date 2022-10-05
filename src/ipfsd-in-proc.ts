import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import mergeOptions from 'merge-options'
import { repoExists, removeRepo, checkForRunningApi, tmpDir, defaultRepo } from './utils.js'
import { logger } from '@libp2p/logger'
import type { Controller, ControllerOptions, InitOptions, IPFSAPI, PeerData } from './index.js'

const merge = mergeOptions.bind({ ignoreUndefined: true })

const daemonLog = {
  info: logger('ipfsd-ctl:proc:stdout'),
  err: logger('ipfsd-ctl:proc:stderr')
}
const rpcModuleLogger = logger('ipfsd-ctl:proc')

/**
 * Controller for in process nodes
 */
class InProc implements Controller {
  public path: string
  // @ts-expect-error set during startup
  public api: IPFSAPI
  public subprocess: null
  public opts: ControllerOptions
  public initialized: boolean
  public started: boolean
  public clean: boolean
  // @ts-expect-error set during startup
  public apiAddr: Multiaddr

  private initOptions: InitOptions
  private readonly disposable: boolean
  private _peerId: PeerData | null

  constructor (opts: ControllerOptions) {
    this.opts = opts
    this.path = this.opts.ipfsOptions?.repo ?? (opts.disposable === true ? tmpDir(opts.type) : defaultRepo(opts.type))
    this.initOptions = toInitOptions(opts.ipfsOptions?.init)
    this.disposable = Boolean(opts.disposable)
    this.initialized = false
    this.started = false
    this.clean = true
    this.subprocess = null
    this._peerId = null
  }

  get peer () {
    if (this._peerId == null) {
      throw new Error('Not started')
    }

    return this._peerId
  }

  async setExec () {
    if (this.api != null) {
      return
    }

    const IPFS = this.opts.ipfsModule

    this.api = await IPFS.create({
      ...this.opts.ipfsOptions,
      silent: true,
      repo: this.path,
      init: this.initOptions
    })
  }

  private _setApi (addr: string): void {
    this.apiAddr = multiaddr(addr)

    if (this.opts.kuboRpcModule != null) {
      rpcModuleLogger('Using kubo-rpc-client')
      this.api = this.opts.kuboRpcModule.create(addr)
    } else if (this.opts.ipfsHttpModule != null) {
      rpcModuleLogger('Using ipfs-http-client')
      this.api = this.opts.ipfsHttpModule.create(addr)
    } else {
      throw new Error('You must pass either a kuboRpcModule or ipfsHttpModule')
    }

    this.api.apiHost = this.apiAddr.nodeAddress().address
    this.api.apiPort = this.apiAddr.nodeAddress().port
  }

  async init (initOptions: InitOptions = {}): Promise<Controller> {
    this.initialized = await repoExists(this.path)
    if (this.initialized) {
      this.clean = false
      return this
    }

    // Repo not initialized
    this.initOptions = merge(
      {
        emptyRepo: false,
        profiles: this.opts.test === true ? ['test'] : []
      },
      this.initOptions,
      toInitOptions(initOptions)
    )

    await this.setExec()
    this.clean = false
    this.initialized = true
    return this
  }

  async cleanup (): Promise<Controller> {
    if (!this.clean) {
      await removeRepo(this.path)
      this.clean = true
    }
    return this
  }

  async start (): Promise<Controller> {
    // Check if a daemon is already running
    const api = checkForRunningApi(this.path)
    if (api != null) {
      this._setApi(api)
    } else {
      await this.setExec()
      await this.api.start()
    }

    this.started = true
    // Add `peerId`
    const id = await this.api.id()
    this._peerId = id
    daemonLog.info(id)
    return this
  }

  async stop (): Promise<Controller> {
    if (!this.started) {
      return this
    }

    await this.api.stop()
    this.started = false

    if (this.disposable) {
      await this.cleanup()
    }
    return this
  }

  /**
   * Get the pid of the `ipfs daemon` process
   */
  async pid (): Promise<number> {
    return await Promise.reject(new Error('not implemented'))
  }

  async version (): Promise<string> {
    await this.setExec()

    const { version } = await this.api.version()

    return version
  }
}

const toInitOptions = (init: boolean | InitOptions = {}): InitOptions =>
  typeof init === 'boolean' ? {} : init

export default InProc
