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

/** @typedef {import("./index").ControllerOptions} ControllerOptions */

/**
 * Controller for remote nodes
 * @class
 */
class Client {
  /**
   * @constructor
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
    this.apiAddr = this._setApi(remoteState.apiAddr)
    this.gatewayAddr = this._setGateway(remoteState.gatewayAddr)
  }

  /**
   * @private
   * @param {string} addr
   */
  _setApi (addr) {
    if (addr) {
      this.apiAddr = multiaddr(addr)
      this.api = (this.opts.ipfsHttpModule.ref)(addr)
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
   * @returns {Promise<Client>}
   */
  async init (initOptions) {
    if (this.initialized) {
      return this
    }

    const opts = merge(
      {
        emptyRepo: false,
        bits: this.opts.test ? 1024 : 2048,
        profiles: this.opts.test ? ['test'] : []

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
   * @returns {Promise<Client>}
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
   * @returns {Promise<Client>}
   */
  async start () {
    if (!this.started) {
      const res = await ky.post(
              `${this.baseUrl}/start`,
              { searchParams: { id: this.id } }
      ).json()

      this._setApi(res.apiAddr)
      this._setGateway(res.gatewayAddr)

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
