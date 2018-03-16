'use strict'

const request = require('superagent')
const IpfsApi = require('ipfs-api')
const multiaddr = require('multiaddr')

function createApi (apiAddr, gwAddr) {
  let api
  if (apiAddr) {
    api = IpfsApi(apiAddr)
    api.apiHost = multiaddr(apiAddr).nodeAddress().address
    api.apiPort = multiaddr(apiAddr).nodeAddress().port
  }

  if (api && gwAddr) {
    api.gatewayHost = multiaddr(gwAddr).nodeAddress().address
    api.gatewayPort = multiaddr(gwAddr).nodeAddress().port
  }

  return api
}

class DaemonClient {
  constructor (baseUrl, _id, initialized, apiAddr, gwAddrs) {
    this.baseUrl = baseUrl
    this._id = _id
    this._apiAddr = multiaddr(apiAddr)
    this._gwAddr = multiaddr(gwAddrs)
    this.initialized = initialized
    this.started = false
    this.api = createApi(apiAddr, gwAddrs)
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
  init (initOpts, cb) {
    if (typeof initOpts === 'function') {
      cb = initOpts
      initOpts = {}
    }

    request
      .post(`${this.baseUrl}/init`)
      .query({ id: this._id })
      .send({ initOpts })
      .end((err, res) => {
        if (err) {
          return cb(new Error(err.response ? err.response.body.message : err))
        }

        this.initialized = res.body.initialized
        cb()
      })
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @param {function(Error)} cb
   * @returns {undefined}
   */
  cleanup (cb) {
    request
      .post(`${this.baseUrl}/cleanup`)
      .query({ id: this._id })
      .end((err) => { cb(err) })
  }

  /**
   * Start the daemon.
   *
   * @param {Array<string>} [flags=[]] - Flags to be passed to the `ipfs daemon` command.
   * @param {function(Error, IpfsApi)} cb
   * @returns {undefined}
   */
  start (flags, cb) {
    if (typeof flags === 'function') {
      cb = flags
      flags = []
    }

    request
      .post(`${this.baseUrl}/start`)
      .query({ id: this._id })
      .send({ flags })
      .end((err, res) => {
        if (err) {
          return cb(new Error(err.response ? err.response.body.message : err))
        }

        this.started = true

        const apiAddr = res.body.api ? res.body.api.apiAddr : ''
        const gatewayAddr = res.body.api ? res.body.api.gatewayAddr : ''

        this.api = createApi(apiAddr, gatewayAddr)
        return cb(null, this.api)
      })
  }

  /**
   * Stop the daemon.
   *
   * @param {function(Error)} [cb]
   * @returns {undefined}
   */
  stop (cb) {
    cb = cb || (() => {})
    request
      .post(`${this.baseUrl}/stop`)
      .query({ id: this._id })
      .end((err) => {
        if (err) {
          return cb(new Error(err.response.body.message))
        }

        this.started = false
        cb(null)
      })
  }

  /**
   * Kill the `ipfs daemon` process.
   *
   * First `SIGTERM` is sent, after 7.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   *
   * @param {function()} [cb] - Called when the process was killed.
   * @returns {undefined}
   */
  killProcess (cb) {
    cb = cb || (() => {})
    request
      .post(`${this.baseUrl}/kill`)
      .query({ id: this._id })
      .end((err) => {
        if (err) {
          return cb(new Error(err.response.body.message))
        }

        this.started = false
        cb(null)
      })
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @param {Function} cb
   * @returns {number}
   */
  pid (cb) {
    request
      .get(`${this.baseUrl}/pid`)
      .query({ id: this._id })
      .end((err, res) => {
        if (err) {
          return cb(new Error(err.response ? err.response.body.message : err))
        }

        cb(null, res.body.pid)
      })
  }

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   *
   * @param {string} [key] - A specific config to retrieve.
   * @param {function(Error, (Object|string))} cb
   * @returns {undefined}
   */
  getConfig (key, cb) {
    if (typeof key === 'function') {
      cb = key
      key = undefined
    }

    const qr = { id: this._id }
    qr.key = key
    request
      .get(`${this.baseUrl}/config`)
      .query(qr)
      .end((err, res) => {
        if (err) {
          return cb(new Error(err.response ? err.response.body.message : err))
        }

        cb(null, res.body.config)
      })
  }

  /**
   * Set a config value.
   *
   * @param {string} key
   * @param {string} value
   * @param {function(Error)} cb
   * @returns {undefined}
   */
  setConfig (key, value, cb) {
    request.put(`${this.baseUrl}/config`)
      .send({ key, value })
      .query({ id: this._id })
      .end((err) => {
        if (err) {
          return cb(new Error(err.response ? err.response.body.message : err))
        }

        cb(null)
      })
  }
}

module.exports = DaemonClient
