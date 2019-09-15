'use strict'

const request = require('superagent')
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
   * @returns {Promise}
   */
  async tmpDir () {
    const res = await request
      .get(`${this.baseUrl}/util/tmp-dir`)

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
    const res = await request
      .post(`${this.baseUrl}/spawn`)
      .send({ options: options, type: this.options.type })

    const apiAddr = res.body.api ? res.body.api.apiAddr : ''
    console.log('TCL: spawn -> apiAddr', apiAddr)
    const gatewayAddr = res.body.api ? res.body.api.gatewayAddr : ''

    const ipfsd = new DaemonClient(
      this.baseUrl,
      res.body.id,
      res.body.initialized,
      apiAddr,
      gatewayAddr,
      { IpfsClient: this.options.IpfsClient }
    )

    return ipfsd
  }
}

module.exports = FactoryClient
