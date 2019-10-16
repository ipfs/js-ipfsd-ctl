'use strict'

const request = require('superagent')
const multiaddr = require('multiaddr')
const merge = require('merge-options')

/** @ignore @typedef {import("./index").FactoryOptions} FactoryOptions */

/**
 * Creates an instance of Client.
 */
class Client {
  /**
   *
   * @param {string} baseUrl
   * @param {Object} remoteState
   * @param {FactoryOptions} options
   */
  constructor (baseUrl, remoteState, options) {
    this.options = options
    this.baseUrl = baseUrl
    this._id = remoteState._id
    this.path = remoteState.path
    this.initialized = remoteState.initialized
    this.started = remoteState.started
    this.clean = true
    this.apiAddr = null
    this.gatewayAddr = null
    this.api = null

    if (this.started) {
      this.setApi(remoteState.apiAddr)
      this.setGateway(remoteState.gatewayAddr)
    }
  }

  setApi (addr) {
    if (addr) {
      this.apiAddr = multiaddr(addr)
      this.api = (this.options.ipfsHttp.ref)(addr)
      this.api.apiHost = this.apiAddr.nodeAddress().address
      this.api.apiPort = this.apiAddr.nodeAddress().port
    }
  }

  setGateway (addr) {
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
    if (this.initialized && typeof initOptions === 'object') {
      throw new Error(`Repo already initialized can't use different options, ${JSON.stringify(initOptions)}`)
    }
    if (this.initialized) {
      this.clean = false
      return this
    }

    const opts = merge(
      {
        emptyRepo: false,
        bits: 2048
      },
      initOptions === true ? {} : initOptions
    )

    const res = await request
      .post(`${this.baseUrl}/init`)
      .query({ id: this._id })
      .send({ opts })

    this.initialized = res.body.initialized

    return this
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @returns {Promise}
   */
  async cleanup () {
    if (this.clean) {
      return this
    }

    await request
      .post(`${this.baseUrl}/cleanup`)
      .query({ id: this._id })

    this.clean = true
  }

  /**
   * Start the daemon.
   *
   * @returns {Promise<IpfsClient>}
   */
  async start () {
    if (this.started) {
      return this.api
    }
    const res = await request
      .post(`${this.baseUrl}/start`)
      .query({ id: this._id })
      .send()

    this.started = true

    const apiAddr = res.body ? res.body.apiAddr : ''
    const gatewayAddr = res.body ? res.body.gatewayAddr : ''

    if (apiAddr) {
      this.setApi(apiAddr)
    }

    if (gatewayAddr) {
      this.setGateway(gatewayAddr)
    }

    return this.api
  }

  /**
   * Stop the daemon.
   *
   * @param {number} [timeout] - Grace period to wait before force stopping the node
   * @returns {Promise<Client>}
   */
  async stop (timeout) {
    if (!this.started) {
      return this
    }
    await request
      .post(`${this.baseUrl}/stop`)
      .query({ id: this._id })
      .send({ timeout })
    this.started = false

    return this
  }

  /**
   * Kill the `ipfs daemon` process.
   *
   * First `SIGTERM` is sent, after 10.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   *
   * @param {number} [timeout] - Grace period to wait before force stopping the node
   * @returns {Promise<Client>}
   */
  async killProcess (timeout) {
    await request
      .post(`${this.baseUrl}/kill`)
      .query({ id: this._id })
      .send({ timeout })

    this.started = false

    return this
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {Promise<number>}
   */
  async pid () {
    const res = await request
      .get(`${this.baseUrl}/pid`)
      .query({ id: this._id })

    return res.body.pid
  }

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   *
   * @param {string} [key] - A specific config to retrieve.
   * @returns {Promise<Any>}
   */
  async getConfig (key) {
    const res = await request
      .get(`${this.baseUrl}/config`)
      .query({ id: this._id, key })

    return res.body.config
  }

  /**
   * Set a config value.
   *
   * @param {string} key
   * @param {string} value
   * @returns {Promise<void>}
   */
  async setConfig (key, value) {
    await request.put(`${this.baseUrl}/config`)
      .send({ key, value })
      .query({ id: this._id })
  }
}

module.exports = Client
