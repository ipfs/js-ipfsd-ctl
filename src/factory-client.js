'use strict'

const request = require('superagent')
const DaemonClient = require('./ipfsd-client')
const merge = require('merge-options')
const defaultConfig = require('./defaults/config.json')

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
      throw new Error('\'proc\' is not supported in client mode')
    }

    this.baseUrl = `${options.secure ? 'https://' : 'http://'}${options.host}:${options.port}`
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   * @param {boolean} isJS
   *
   * @returns {Promise}
   */
  async tmpDir (isJS) {
    const res = await request
      .get(`${this.baseUrl}/util/tmp-dir`)
      .query({ type: isJS ? 'js' : 'go' })

    return res.body.tmpDir
  }

  /**
   * Get the version of the IPFS Daemon.
   *
   * @param {Object} [options={}]
   * @returns {Promise}
   */
  async version (options = {}) {
    options = options || { type: this.options.type }

    const res = await request
      .get(`${this.baseUrl}/version`)
      .query(options)

    return res.body.version
  }

  /**
   * Spawn a remote daemon using ipfs-http-client
   *
   * @param {SpawnOptions} [options={}]
   * @return {Promise}
   */
  async spawn (options = {}) {
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

    const res = await request
      .post(`${this.baseUrl}/spawn`)
      .send(daemonOptions)

    const ipfsd = new DaemonClient(
      this.baseUrl,
      res.body,
      daemonOptions
    )

    return ipfsd
  }
}

module.exports = FactoryClient
