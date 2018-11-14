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
    this.initialized = remoteState.initialized
    this.started = remoteState.started
    this.clean = true
    this.apiAddr = null
    this.gatewayAddr = null
    this.path = remoteState.path
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
   * @param {Object} [initOptions={}]
   * @param {number} [initOptions.keysize=2048] - The bit size of the identiy key.
   * @param {string} [initOptions.directory=IPFS_PATH] - The location of the repo.
   * @param {function (Error, Node)} callback
   * @returns {void}
   */
  init (initOptions, callback) {
    if (typeof initOptions === 'function') {
      callback = initOptions
      initOptions = null
    }

    if (this.initialized && initOptions) {
      return callback(new Error(`Repo already initialized can't use different options, ${JSON.stringify(initOptions)}`))
    }

    if (this.initialized) {
      this.clean = false
      return callback(null, this)
    }

    initOptions = initOptions || {}
    // TODO probably needs to change config like the other impl
    request
      .post(`${this.baseUrl}/init`)
      .query({ id: this._id })
      .send({ initOptions })
      .end((err, res) => {
        if (err) {
          return callback(new Error(err.response ? err.response.body.message : err))
        }

        this.clean = false
        this.initialized = res.body.initialized
        callback(null, this)
      })
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @param {function(Error)} cb
   * @returns {void}
   */
  cleanup (cb) {
    if (this.clean) {
      return cb()
    }

    request
      .post(`${this.baseUrl}/cleanup`)
      .query({ id: this._id })
      .end((err) => {
        if (err) {
          return cb(err)
        }
        this.clean = true
        cb(null, this)
      })
  }

  /**
   * Start the daemon.
   *
   * @param {Array<string>} [flags=[]] - Flags to be passed to the `ipfs daemon` command.
   * @param {function(Error, IpfsClient)} cb
   * @returns {undefined}
   */
  start (flags, cb) {
    if (typeof flags === 'function') {
      cb = flags
      flags = []
    }

    if (this.started) {
      return cb(null, this.api)
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

        const apiAddr = res.body ? res.body.apiAddr : ''
        const gatewayAddr = res.body ? res.body.gatewayAddr : ''

        if (apiAddr) {
          this.setApi(apiAddr)
        }

        if (gatewayAddr) {
          this.setGateway(gatewayAddr)
        }
        return cb(null, this.api)
      })
  }

  /**
   * Stop the daemon.
   *
   * @param {integer|undefined} timeout - Grace period to wait before force stopping the node
   * @param {function(Error)} [cb]
   * @returns {undefined}
   */
  stop (timeout, cb) {
    if (typeof timeout === 'function') {
      cb = timeout
      timeout = undefined
    }

    cb = cb || (() => {})
    request
      .post(`${this.baseUrl}/stop`)
      .query({ id: this._id })
      .send({ timeout })
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
   * First `SIGTERM` is sent, after 10.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   *
   * @param {integer|undefined} timeout - Grace period to wait before force stopping the node
   * @param {function()} [cb] - Called when the process was killed.
   * @returns {undefined}
   */
  killProcess (timeout, cb) {
    if (typeof timeout === 'function') {
      cb = timeout
      timeout = undefined
    }

    cb = cb || (() => {})
    request
      .post(`${this.baseUrl}/kill`)
      .query({ id: this._id })
      .send({ timeout })
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
   * @param {function(Error, number): void} cb - receives the pid
   * @returns {void}
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
   * @returns {void}
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
   * @returns {void}
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

module.exports = Client
