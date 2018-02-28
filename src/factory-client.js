'use strict'

const request = require('superagent')
const DaemonClient = require('./ipfsd-client')

/*
 * Exposes the same Factory API but uses a remote endpoint to create the Daemons/Nodes
 */
class FactoryClient {
  constructor (options) {
    options = options || {}
    if (!options.host) { options.host = 'localhost' }
    if (!options.port) { options.port = 43134 }
    if (typeof options.host === 'number') {
      options.port = options.host
      options.host = 'localhost'
    }

    this.port = options.port
    this.host = options.host
    this.type = options.type || 'go'

    if (this.type === 'proc') {
      throw new Error(`'proc' is not supported in client mode`)
    }

    this.baseUrl = `${options.secure ? 'https://' : 'http://'}${this.host}:${this.port}`
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   *
   * @param {String} type - the type of the node
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  tmpDir (type, callback) {
    request
      .get(`${this.baseUrl}/util/tmp-dir`)
      .end((err, res) => {
        if (err) {
          return callback(new Error(err.response ? err.response.body.message : err))
        }

        callback(null, res.body.tmpDir)
      })
  }

  /**
   * Get the version of the IPFS Daemon.
   *
   * @memberof FactoryDaemon
   * @param {Object} [options={}]
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  version (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = undefined
    }

    options = options || { type: this.type }

    request
      .get(`${this.baseUrl}/version`)
      .query(options)
      .end((err, res) => {
        if (err) {
          return callback(new Error(err.response ? err.response.body.message : err))
        }

        callback(null, res.body.version)
      })
  }

  spawn (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    options = options || {}

    request
      .post(`${this.baseUrl}/spawn`)
      .send({ options: options, type: this.type })
      .end((err, res) => {
        if (err) {
          return callback(new Error(err.response ? err.response.body.message : err))
        }

        const apiAddr = res.body.api ? res.body.api.apiAddr : ''
        const gatewayAddr = res.body.api ? res.body.api.gatewayAddr : ''

        const ipfsd = new DaemonClient(
          this.baseUrl,
          res.body.id,
          res.body.initialized,
          apiAddr,
          gatewayAddr
        )

        callback(null, ipfsd)
      })
  }
}

module.exports = FactoryClient
