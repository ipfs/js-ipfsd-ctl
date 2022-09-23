import http from 'ipfs-utils/src/http.js'
import mergeOptions from 'merge-options'
import { logger } from '@libp2p/logger'
import ControllerBase from './controller-base.js'
import type { ControllerOptions, NodeType, RemoteState } from './types.js'

const merge = mergeOptions.bind({ ignoreUndefined: true })

const daemonLog = {
  info: logger('ipfsd-ctl:client:stdout'),
  err: logger('ipfsd-ctl:client:stderr')
}
const rpcModuleLogger = logger('ipfsd-ctl:client')

/**
 * Controller for remote nodes
 */
class Client<T extends NodeType = NodeType> extends ControllerBase<T> {
  baseUrl: string
  id: string
  constructor (baseUrl: string, remoteState: RemoteState, options: ControllerOptions<T>) {
    super(options)
    this.opts = options
    this.baseUrl = baseUrl
    this.id = remoteState.id
    this.path = remoteState.path
    this.initialized = remoteState.initialized
    this.started = remoteState.started
    this.disposable = remoteState.disposable
    this.clean = remoteState.clean
    // this.api = null
    // /** @type {import('./types').Subprocess | null} */
    this.subprocess = null
    // /** @type {Multiaddr} */
    // this.apiAddr // eslint-disable-line no-unused-expressions

    this._setApi(remoteState.apiAddr)
    this._setGateway(remoteState.gatewayAddr)
    this._setGrpc(remoteState.grpcAddr)
    this._createApi()
    /** @type {import('./types').PeerData | null} */
    this._peerId = null
  }

  get peer () {
    if (this._peerId == null) {
      throw new Error('Not started')
    }

    return this._peerId
  }

  /**
   * @private
   */
  _createApi () {
    if (this.opts.ipfsClientModule != null && this.grpcAddr != null && this.apiAddr != null) {
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

    if (this.api != null) {
      if (this.apiAddr != null) {
        // @ts-expect-error
        this.api.apiHost = this.apiAddr.nodeAddress().address
        // @ts-expect-error
        this.api.apiPort = this.apiAddr.nodeAddress().port
      }

      if (this.gatewayAddr != null) {
        // @ts-expect-error
        this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
        // @ts-expect-error
        this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
      }

      if (this.grpcAddr != null) {
        // @ts-expect-error
        this.api.grpcHost = this.grpcAddr.nodeAddress().address
        // @ts-expect-error
        this.api.grpcPort = this.grpcAddr.nodeAddress().port
      }
    }
  }

  /**
   * Initialize a repo.
   *
   * @param {import('./types').InitOptions} [initOptions]
   * @returns {Promise<import('./types').Controller<T>>}
   */
  async init (initOptions = {}) {
    if (this.initialized) {
      return this
    }

    let ipfsOptions = {}

    if (this.opts.ipfsOptions?.init != null && !(typeof this.opts.ipfsOptions.init === 'boolean')) {
      ipfsOptions = this.opts.ipfsOptions.init
    }

    const opts = merge(
      {
        emptyRepo: false,
        profiles: this.opts.test === true ? ['test'] : []
      },
      ipfsOptions,
      typeof initOptions === 'boolean' ? {} : initOptions
    )

    const req = await http.post(
        `${this.baseUrl}/init`,
        {
          searchParams: new URLSearchParams({ id: this.id }),
          json: opts
        }
    )
    const rsp = await req.json()
    this.initialized = rsp.initialized
    this.clean = false
    return this
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   */
  async cleanup (): Promise<this> {
    if (this.clean) {
      return this
    }

    await http.post(
        `${this.baseUrl}/cleanup`,
        { searchParams: new URLSearchParams({ id: this.id }) }
    )
    this.clean = true
    return this
  }

  /**
   * Start the daemon.
   */
  async start (): Promise<this> {
    if (!this.started) {
      const req = await http.post(
              `${this.baseUrl}/start`,
              { searchParams: new URLSearchParams({ id: this.id }) }
      )
      const res = await req.json()

      this._setApi(res.apiAddr)
      this._setGateway(res.gatewayAddr)
      this._setGrpc(res.grpcAddr)
      this._createApi()

      this.started = true
    }

    // // Add `peerId`
    // const id = await this.api.id()
    // this._peerId = id
    // daemonLog.info(id)
    await this._postStart()
    daemonLog.info(this._peerId)

    return this
  }

  /**
   * Stop the daemon
   */
  async stop (): Promise<this> {
    if (!this.started) {
      return this
    }

    await http.post(
      `${this.baseUrl}/stop`,
      { searchParams: new URLSearchParams({ id: this.id }) }
    )
    this.started = false

    if (this.disposable) {
      await this.cleanup()
    }

    return this
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   */
  async pid (): Promise<number> {
    const req = await http.get(
        `${this.baseUrl}/pid`,
        { searchParams: new URLSearchParams({ id: this.id }) }
    )
    const res = await req.json()

    return res.pid
  }

  /**
   * Get the version of ipfs
   */
  async version (): Promise<string> {
    const req = await http.get(
        `${this.baseUrl}/version`,
        { searchParams: new URLSearchParams({ id: this.id }) }
    )
    const res = await req.json()
    return res.version
  }
}

export default Client
