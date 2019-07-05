'use strict'

const request = require('superagent')
const IpfsClient = require('ipfs-http-client')
const multiaddr = require('multiaddr')

function createApi (apiAddr, gwAddr, IpfsClient) {
  let api
  if (apiAddr) {
    api = IpfsClient(apiAddr)
    api.apiHost = multiaddr(apiAddr).nodeAddress().address
    api.apiPort = multiaddr(apiAddr).nodeAddress().port
  }

  if (api && gwAddr) {
    api.gatewayHost = multiaddr(gwAddr).nodeAddress().address
    api.gatewayPort = multiaddr(gwAddr).nodeAddress().port
  }

  return api
}

function translateError (err) {
  let message = err.message

  if (err.response && err.response.body && err.response.body.message) {
    message = err.response.body.message
  }

  const output = new Error(message)
  output.status = err.status
  output.response = err.response
  output.stack = err.stack
  output.message = message

  throw output
}

/**
 * Creates an instance of Client.
 *
 * @param {*} baseUrl
 * @param {*} _id
 * @param {*} initialized
 * @param {*} apiAddr
 * @param {*} gwAddrs
 * @param {*} options
 */
class Client {
  constructor (baseUrl, _id, initialized, apiAddr, gwAddrs, options) {
    this.options = options || {}
    this.baseUrl = baseUrl
    this._id = _id
    this._apiAddr = multiaddr(apiAddr)
    this._gwAddr = multiaddr(gwAddrs)
    this.initialized = initialized
    this.started = false
    this.api = createApi(apiAddr, gwAddrs, this.options.IpfsClient || IpfsClient)
  }

  /**
   * Get the address of connected IPFS API.
   *
   * @returns {Multiaddr}
   */
  get apiAddr () {
    return this._apiAddr
  }

  /**
   * Set the address of connected IPFS API.
   *
   * @param {Multiaddr} addr
   * @returns {void}
   */
  set apiAddr (addr) {
    this._apiAddr = addr
  }

  /**
   * Get the address of connected IPFS HTTP Gateway.
   *
   * @returns {Multiaddr}
   */
  get gatewayAddr () {
    return this._gwAddr
  }

  /**
   * Set the address of connected IPFS Gateway.
   *
   * @param {Multiaddr} addr
   * @returns {void}
   */
  set gatewayAddr (addr) {
    this._gwAddr = addr
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOpts={}]
   * @param {number} [initOpts.keysize=2048] - The bit size of the identiy key.
   * @param {string} [initOpts.directory=IPFS_PATH] - The location of the repo.
   * @param {function (Error, Node)} cb
   * @returns {undefined}
   */
  async init (initOpts = {}) {
    const res = await request
      .post(`${this.baseUrl}/init`)
      .query({ id: this._id })
      .send({ initOpts })
      .catch(translateError)

    this.initialized = res.body.initialized

    return this
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @param {function(Error)} cb
   * @returns {undefined}
   */
  cleanup () {
    return request
      .post(`${this.baseUrl}/cleanup`)
      .query({ id: this._id })
      .catch(translateError)
  }

  /**
   * Start the daemon.
   *
   * @param {Array<string>} [flags=[]] - Flags to be passed to the `ipfs daemon` command.
   * @param {function(Error, IpfsClient)} cb
   * @returns {undefined}
   */
  async start (flags = []) {
    const res = await request
      .post(`${this.baseUrl}/start`)
      .query({ id: this._id })
      .send({ flags })
      .catch(translateError)

    this.started = true

    const apiAddr = res.body.api ? res.body.api.apiAddr : ''
    const gatewayAddr = res.body.api ? res.body.api.gatewayAddr : ''

    this.api = createApi(apiAddr, gatewayAddr, this.options.IpfsClient || IpfsClient)

    return this.api
  }

  /**
   * Stop the daemon.
   *
   * @param {integer|undefined} timeout - Grace period to wait before force stopping the node
   * @param {function(Error)} [cb]
   * @returns {undefined}
   */
  async stop (timeout) {
    await request
      .post(`${this.baseUrl}/stop`)
      .query({ id: this._id })
      .send({ timeout })
      .catch(translateError)

    this.started = false
  }

  /**
   * Kill the `ipfs daemon` process.
   *
   * First `SIGTERM` is sent, after 10.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   *
   * @param {integer|undefined} timeout - Grace period to wait before force stopping the node
   * @param {function()} [cb] - Called when the process was killed.
   * @returns {undefined}
   */
  async killProcess (timeout) {
    await request
      .post(`${this.baseUrl}/kill`)
      .query({ id: this._id })
      .send({ timeout })
      .catch(translateError)

    this.started = false
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @param {function(Error, number): void} cb - receives the pid
   * @returns {void}
   */
  async pid () {
    const res = await request
      .get(`${this.baseUrl}/pid`)
      .query({ id: this._id })
      .catch(translateError)

    return res.body.pid
  }

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   *
   * @param {string} [key] - A specific config to retrieve.
   * @param {function(Error, (Object|string))} cb
   * @returns {void}
   */
  async getConfig (key) {
    const qr = { id: this._id }

    if (key) {
      qr.key = key
    }

    const res = await request
      .get(`${this.baseUrl}/config`)
      .query(qr)
      .catch(translateError)

    return res.body.config
  }

  /**
   * Set a config value.
   *
   * @param {string} key
   * @param {string} value
   * @param {function(Error)} cb
   * @returns {void}
   */
  async setConfig (key, value) {
    await request.put(`${this.baseUrl}/config`)
      .send({ key, value })
      .query({ id: this._id })
      .catch(translateError)
  }
}

module.exports = Client
