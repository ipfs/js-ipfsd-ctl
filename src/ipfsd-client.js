'use strict'

const multiaddr = require('multiaddr')
const merge = require('merge-options')
const debug = require('debug')
const kyOriginal = require('ky-universal').default

const ky = kyOriginal.extend({ timeout: false })

const daemonLog = {
  info: debug('ipfsd-ctl:client:stdout'),
  err: debug('ipfsd-ctl:client:stderr')
}

/** @typedef {import("./index").FactoryOptions} FactoryOptions */
/** @typedef {import("./ipfsd-daemon")} Daemon */
/** @typedef {import("ipfs")} IPFS */
/**
 * Creates an instance of Client.
 * @class
 */
class Client {
  /**
   * @constructor
   * @param {string} baseUrl
   * @param {Object} remoteState
   * @param {FactoryOptions} options
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
    this.apiAddr = null
    this.gatewayAddr = null
    this.api = null

    if (this.started) {
      this._setApi(remoteState.apiAddr)
      this._setGateway(remoteState.gatewayAddr)
    }
  }

  /**
   * @private
   * @param {string} addr
   */
  _setApi (addr) {
    if (addr) {
      this.apiAddr = multiaddr(addr)
      this.api = (this.opts.ipfsHttp.ref)(addr)
      this.api.apiHost = this.apiAddr.nodeAddress().address
      this.api.apiPort = this.apiAddr.nodeAddress().port
    }
  }

  /**
   * @private
   * @param {string} addr
   */
  _setGateway (addr) {
    if (addr) {
      this.gatewayAddr = multiaddr(addr)
      this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
      this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
    }
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOptions] - @see https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsinit
   * @returns {Promise<Daemon>}
   */
  async init (initOptions) {
    if (this.initialized) {
      this.clean = false
      return this
    }

    const opts = merge(
      {
        emptyRepo: false,
        bits: 2048
      },
      typeof this.opts.ipfsOptions.init === 'boolean' ? {} : this.opts.ipfsOptions.init,
      typeof initOptions === 'boolean' ? {} : initOptions
    )

    const res = await ky.post(
        `${this.baseUrl}/init`,
        { searchParams: { id: this.id }, json: opts }
    ).json()
    this.initialized = res.initialized
    this.clean = false
    return this
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @returns {Promise<Daemon>}
   */
  async cleanup () {
    if (this.clean) {
      return this
    }

    await ky.post(
        `${this.baseUrl}/cleanup`,
        { searchParams: { id: this.id } }
    )
    this.clean = true
    return this
  }

  /**
   * Start the daemon.
   *
   * @returns {Promise<IPFS>}
   */
  async start () {
    if (this.started) {
      return this.api
    }

    const res = await ky.post(
        `${this.baseUrl}/start`,
        { searchParams: { id: this.id } }
    ).json()
    this.started = true

    const apiAddr = res ? res.apiAddr : ''
    const gatewayAddr = res ? res.gatewayAddr : ''

    if (apiAddr) {
      this._setApi(apiAddr)
    }

    if (gatewayAddr) {
      this._setGateway(gatewayAddr)
    }
    daemonLog.info(await this.api.id())

    return this.api
  }

  /**
   * Stop the daemon.
   *
   * @returns {Promise<Daemon>}
   */
  async stop () {
    if (!this.started) {
      return this
    }

    await ky.post(
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
    const res = await ky.get(
        `${this.baseUrl}/pid`,
        { searchParams: { id: this.id } }
    ).json()

    return res.pid
  }

  /**
   * Get the version of ipfs
   *
   * @returns {Promise<String>}
   */
  async version () {
    const res = await ky.get(
        `${this.baseUrl}/version`,
        { searchParams: { id: this.id } }
    ).json()
    return res.version
  }
}

module.exports = Client
