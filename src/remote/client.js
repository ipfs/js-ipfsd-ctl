'use strict'

const request = require('http')
const IpfsApi = require('ipfs-api')
const multiaddr = require('multiaddr')
const utils = require('./utils')

const encodeParams = utils.encodeParams
const getResponse = utils.getResponse

function _createApi (apiAddr, gwAddr) {
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

const createRemoteFactory = (host, port) => {
  // create a client

  if (!host) {
    host = 'localhost'
  }

  if (!port) {
    port = 9999
  }

  class Node {
    constructor (id, apiAddr, gwAddrs) {
      this._id = id
      this._apiAddr = multiaddr(apiAddr)
      this._gwAddr = multiaddr(gwAddrs)
      this.initialized = false
      this.started = false
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
      request.get({ host, port, path: `/init?${encodeParams(this._id, { initOpts })}` },
        (res) => getResponse(res, (err, res) => {
          if (err) {
            return cb(err)
          }

          this.initialized = true
          cb(null, res)
        }))
    }

    /**
     * Delete the repo that was being used.
     * If the node was marked as `disposable` this will be called
     * automatically when the process is exited.
     *
     * @param {function(Error)} cb
     * @returns {undefined}
     */
    shutdown (cb) {
      request.get({ host, port, path: `/shutdown` }, (res) => { getResponse(res, cb) })
    }

    /**
     * Start the daemon.
     *
     * @param {Array<string>} [flags=[]] - Flags to be passed to the `ipfs daemon` command.
     * @param {function(Error, IpfsApi)} cb
     * @returns {undefined}
     */
    startDaemon (flags, cb) {
      if (typeof flags === 'function') {
        cb = flags
        flags = {}
      }
      request.get({ host, port, path: `/startDaemon?${encodeParams(this._id, { flags })}` }, (res) => {
        getResponse(res, (err, res) => {
          if (err) {
            return cb(err)
          }

          this.started = true

          const apiAddr = res.data ? res.data.apiAddr : ''
          const gatewayAddr = res.data ? res.data.gatewayAddr : ''

          return cb(null, _createApi(apiAddr, gatewayAddr))
        })
      })
    }

    /**
     * Stop the daemon.
     *
     * @param {function(Error)} cb
     * @returns {undefined}
     */
    stopDaemon (cb) {
      request.get({ host, port, path: `/stopDaemon?${encodeParams(this._id)}` },
        (res) => {
          getResponse(res, (err) => {
            if (err) {
              return cb(err)
            }

            this.started = false
            cb(null)
          })
        })
    }

    /**
     * Kill the `ipfs daemon` process.
     *
     * First `SIGTERM` is sent, after 7.5 seconds `SIGKILL` is sent
     * if the process hasn't exited yet.
     *
     * @param {function()} cb - Called when the process was killed.
     * @returns {undefined}
     */
    killProcess (cb) {
      request.get({ host, port, path: `/killProcess` }, (res) => {
        getResponse(res, (err) => {
          if (err) {
            return cb(err)
          }

          this.started = false
          cb(null)
        })
      })
    }

    /**
     * Get the pid of the `ipfs daemon` process.
     *
     * @param {Function} cb
     * @returns {number}
     */
    daemonPid (cb) {
      request.get({ host, port, path: `/daemonPid` }, (res) => {
        getResponse(res, (err, data) => {
          if (err) {
            return cb(err)
          }

          this.started = false
          cb(null, data)
        })
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
        key = null
      }

      request.get({ host, port, path: `/getConfig?${encodeParams(this._id, { key })}` }, (res) => {
        getResponse(res, (err, res) => {
          if (err) {
            return cb(err)
          }

          this.started = false
          cb(null, res.data)
        })
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
      request.get({ host, port, path: `/setConfig?${encodeParams(this._id, { key, value })}` }, (res) => {
        getResponse(res, (err, data) => {
          if (err) {
            return cb(err)
          }

          this.started = false
          cb(null, data)
        })
      })
    }

    /**
     * Replace the configuration with a given file
     *
     * @param {string} file - path to the new config file
     * @param {function(Error)} cb
     * @returns {undefined}
     */

    replaceConf (file, cb) {
      cb(new Error('not implemented'))
    }
  }

  return {
    spawn: (opts, cb) => {
      if (typeof opts === 'function') {
        cb = opts
        opts = {}
      }

      request.get({ host, port, path: `/spawn?${encodeParams(this._id, { opts })}` }, (res) => {
        getResponse(res, (err, res) => {
          if (err) {
            return cb(err)
          }

          const apiAddr = res.data ? res.data.apiAddr : ''
          const gatewayAddr = res.data ? res.data.gatewayAddr : ''

          const node = new Node(
            res._id,
            apiAddr,
            gatewayAddr)

          cb(null, { ctl: _createApi(apiAddr, gatewayAddr), ctrl: node })
        })
      })
    }
  }
}

module.exports = createRemoteFactory
