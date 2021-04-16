'use strict'

const { Multiaddr } = require('multiaddr')
const http = require('ipfs-utils/src/http')
const merge = require('merge-options').bind({ ignoreUndefined: true })
const debug = require('debug')

const daemonLog = {
  info: debug('ipfsd-ctl:client:stdout'),
  err: debug('ipfsd-ctl:client:stderr')
}

/** @typedef {import("./index").ControllerOptions} ControllerOptions */

/**
 * Controller for remote nodes
 *
 * @class
 */
class Client {
  /**
   * @class
   * @param {string} baseUrl
   * @param {Object} remoteState
   * @param {ControllerOptions} options
   */
  constructor (baseUrl, remoteState, options) {
    this.opts = options
    this.baseUrl = baseUrl
    this.id = remoteState.id
    this.path = remoteState.path
    this.initialized = remoteState.initialized
    this.started = remoteState.started
    this.disposable = remoteState.disposable
    this.clean = remoteState.clean
    this.api = null

    this._setApi(remoteState.apiAddr)
    this._setGateway(remoteState.gatewayAddr)
    this._setGrpc(remoteState.grpcAddr)
    this._createApi()
  }

  /**
   * @private
   * @param {string} addr
   */
  _setApi (addr) {
    if (addr) {
      this.apiAddr = new Multiaddr(addr)
    }
  }

  /**
   * @private
   * @param {string} addr
   */
  _setGateway (addr) {
    if (addr) {
      this.gatewayAddr = new Multiaddr(addr)
    }
  }

  /**
   * @private
   * @param {string} addr
   */
  _setGrpc (addr) {
    if (addr) {
      this.grpcAddr = new Multiaddr(addr)
    }
  }

  /**
   * @private
   */
  _createApi () {
    if (this.opts.ipfsClientModule && this.grpcAddr && this.apiAddr) {
      this.api = this.opts.ipfsClientModule.create({
        grpc: this.grpcAddr,
        http: this.apiAddr
      })
    } else if (this.apiAddr) {
      this.api = this.opts.ipfsHttpModule.create(this.apiAddr)
    }

    if (this.api) {
      if (this.apiAddr) {
        this.api.apiHost = this.apiAddr.nodeAddress().address
        this.api.apiPort = this.apiAddr.nodeAddress().port
      }

      if (this.gatewayAddr) {
        this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
        this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
      }

      if (this.grpcAddr) {
        this.api.grpcHost = this.grpcAddr.nodeAddress().address
        this.api.grpcPort = this.grpcAddr.nodeAddress().port
      }
    }
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOptions] - @see https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsinit
   * @returns {Promise<Client>}
   */
  async init (initOptions) {
    if (this.initialized) {
      return this
    }

    const opts = merge(
      {
        emptyRepo: false,
        profiles: this.opts.test ? ['test'] : []

      },
      typeof this.opts.ipfsOptions.init === 'boolean' ? {} : this.opts.ipfsOptions.init,
      typeof initOptions === 'boolean' ? {} : initOptions
    )

    const req = await http.post(
        `${this.baseUrl}/init`,
        {
          searchParams: { id: this.id },
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
   *
   * @returns {Promise<Client>}
   */
  async cleanup () {
    if (this.clean) {
      return this
    }

    await http.post(
        `${this.baseUrl}/cleanup`,
        { searchParams: { id: this.id } }
    )
    this.clean = true
    return this
  }

  /**
   * Start the daemon.
   *
   * @returns {Promise<Client>}
   */
  async start () {
    if (!this.started) {
      const req = await http.post(
              `${this.baseUrl}/start`,
              { searchParams: { id: this.id } }
      )
      const res = await req.json()

      this._setApi(res.apiAddr)
      this._setGateway(res.gatewayAddr)
      this._setGrpc(res.grpcAddr)
      this._createApi()

      this.started = true
    }

    // Add `peerId`
    const id = await this.api.id()
    this.api.peerId = id
    daemonLog.info(id)
    return this
  }

  /**
   * Stop the daemon.
   *
   * @returns {Promise<Client>}
   */
  async stop () {
    if (!this.started) {
      return this
    }

    await http.post(
      `${this.baseUrl}/stop`,
      { searchParams: { id: this.id } }
    )
    this.started = false

    if (this.disposable) {
      await this.cleanup()
    }

    return this
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {Promise<number>}
   */
  async pid () {
    const req = await http.get(
        `${this.baseUrl}/pid`,
        { searchParams: { id: this.id } }
    )
    const res = await req.json()

    return res.pid
  }

  /**
   * Get the version of ipfs
   *
   * @returns {Promise<string>}
   */
  async version () {
    const req = await http.get(
        `${this.baseUrl}/version`,
        { searchParams: { id: this.id } }
    )
    const res = await req.json()
    return res.version
  }
}

module.exports = Client
