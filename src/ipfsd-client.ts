import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import http from 'ipfs-utils/src/http.js'
import mergeOptions from 'merge-options'
import { logger } from '@libp2p/logger'
import type { Controller, ControllerOptions, InitOptions, IPFSAPI, PeerData, RemoteState } from './index.js'

const merge = mergeOptions.bind({ ignoreUndefined: true })

const daemonLog = {
  info: logger('ipfsd-ctl:client:stdout'),
  err: logger('ipfsd-ctl:client:stderr')
}
const rpcModuleLogger = logger('ipfsd-ctl:client')

/**
 * Controller for remote nodes
 */
class Client implements Controller {
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

  private readonly baseUrl: string
  private readonly id: string
  private readonly disposable: boolean
  private gatewayAddr?: Multiaddr
  private grpcAddr?: Multiaddr
  private _peerId: PeerData | null

  constructor (baseUrl: string, remoteState: RemoteState, options: ControllerOptions) {
    this.opts = options
    this.baseUrl = baseUrl
    this.id = remoteState.id
    this.path = remoteState.path
    this.initialized = remoteState.initialized
    this.started = remoteState.started
    this.disposable = remoteState.disposable
    this.clean = remoteState.clean
    this.subprocess = null

    this._setApi(remoteState.apiAddr)
    this._setGateway(remoteState.gatewayAddr)
    this._setGrpc(remoteState.grpcAddr)
    this._createApi()
    this._peerId = null
  }

  get peer () {
    if (this._peerId == null) {
      throw new Error('Not started')
    }

    return this._peerId
  }

  private _setApi (addr: string): void {
    if (addr != null) {
      this.apiAddr = multiaddr(addr)
    }
  }

  private _setGateway (addr: string): void {
    if (addr != null) {
      this.gatewayAddr = multiaddr(addr)
    }
  }

  private _setGrpc (addr: string): void {
    if (addr != null) {
      this.grpcAddr = multiaddr(addr)
    }
  }

  private _createApi (): void {
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
  }

  async init (initOptions: InitOptions = {}): Promise<Controller> {
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

  async cleanup (): Promise<Controller> {
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

  async start (): Promise<Controller> {
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

    if (this.api == null) {
      throw new Error('api was not set')
    }

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

  async pid (): Promise<number> {
    const req = await http.get(
        `${this.baseUrl}/pid`,
        { searchParams: new URLSearchParams({ id: this.id }) }
    )
    const res = await req.json()

    return res.pid
  }

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
