'use strict'

const request = require('superagent')
const IpfsClient = require('ipfs-http-client')
const multiaddr = require('multiaddr')

/**
 * Creates an instance of Client.
 *
 * @param {*} baseUrl
 * @param {*} _id
 * @param {*} initialized
 * @param {*} options
 */
class Client {
  constructor (baseUrl, remoteState, options = {}) {
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
      this.api = (this.options.IpfsClient || IpfsClient)(addr)
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
   * @param {Object} [initOptions]
   * @param {number} [initOptions.keysize=2048] - The bit size of the identiy key.
   * @param {string} [initOptions.directory=IPFS_PATH] - The location of the repo.
   * @returns {Promise<Client>}
   */
  async init (initOptions) {
    if (this.initialized && initOptions) {
      throw new Error(`Repo already initialized can't use different options, ${JSON.stringify(initOptions)}`)
    }
    if (this.initialized) {
      this.clean = false
      return this
    }

    initOptions = initOptions || {}

    // TODO probably needs to change config like the other impl
    const res = await request
      .post(`${this.baseUrl}/init`)
      .query({ id: this._id })
      .send({ initOptions })

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
   * @param {Array<string>} [flags=[]] - Flags to be passed to the `ipfs daemon` command.
   * @returns {Promise<IpfsClient>}
   */
  async start (flags = []) {
    if (this.started) {
      return this.api
    }
    const res = await request
      .post(`${this.baseUrl}/start`)
      .query({ id: this._id })
      .send({ flags })

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
