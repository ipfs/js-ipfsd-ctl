'use strict'

const request = require('superagent')
const merge = require('merge-options')
const defaultConfig = require('./defaults/config.json')
const DaemonClient = require('./ipfsd-client')

/** @ignore @typedef {import("./index").SpawnOptions} SpawnOptions */

/**
 * Exposes the same Factory API but uses a remote endpoint to create the Daemons/Nodes
 * @param {Object} options
 */
class FactoryClient {
  constructor (options) {
    options = options || {}
    if (!options.host) { options.host = 'localhost' }
    if (!options.port) { options.port = 43134 }
    if (!options.type) { options.type = 'go' }
    if (typeof options.host === 'number') {
      options.port = options.host
      options.host = 'localhost'
    }

    this.options = options

    if (options.type === 'proc') {
      throw new Error(`'proc' is not supported in client mode`)
    }

    this.baseUrl = `${options.secure ? 'https://' : 'http://'}${options.host}:${options.port}`
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   *
   * @param {string} type - the type of the node
   * @param {function(Error, string): void} callback
   * @returns {void}
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
   * @param {Object} [options={}]
   * @param {function(Error, string): void} callback
   * @returns {undefined}
   */
  version (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = undefined
    }

    options = options || { type: this.options.type }

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

  /**
   * Spawn a remote daemon using ipfs-http-client
   *
   * @param {SpawnOptions} [options={}]
   * @param {function(Error, DaemonClient)} callback
   * @return {void}
   */
  spawn (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    const daemonOptions = merge({
      exec: this.options.exec,
      type: this.options.type,
      IpfsClient: this.options.IpfsClient,
      disposable: true,
      start: options.disposable !== false,
      init: options.disposable !== false,
      config: defaultConfig
    }, options)

    if (options.defaultAddrs) {
      delete daemonOptions.config.Addresses
    }
    request
      .post(`${this.baseUrl}/spawn`, daemonOptions)
      .end((err, res) => {
        if (err) {
          return callback(new Error(err.response ? err.response.body.message : err))
        }
        const node = new DaemonClient(
          this.baseUrl,
          res.body,
          daemonOptions
        )

        callback(null, node)
      })
  }
}

module.exports = FactoryClient
