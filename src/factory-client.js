'use strict'

const request = require('superagent')
const DaemonClient = require('./ipfsd-client')
const merge = require('merge-options')
const defaultConfig = require('./defaults/config.json')
// const findBin = require('./utils/find-ipfs-executable')

/** @ignore @typedef {import("./index").IpfsOptions} IpfsOptions */
/** @ignore @typedef {import("./index").FactoryOptions} FactoryOptions */

/**
 * Exposes the same Factory API but uses a remote endpoint to create the Daemons/Nodes
 */
class FactoryClient {
  /**
   * @param {FactoryOptions} options
   */
  constructor (options = {}) {
    /** @type FactoryOptions */
    this.options = merge({
      host: 'localhost',
      port: 43134,
      secure: false,
      type: 'go',
      defaultAddrs: false,
      disposable: true,
      env: process.env,
      args: [],
      ipfsHttp: {
        path: require.resolve('ipfs-http-client'),
        ref: require('ipfs-http-client')
      },
      ipfsApi: {
        path: require.resolve('ipfs'),
        ref: require('ipfs')
      }
      // ipfsBin: findBin(options.type || 'go')
    }, options)

    this.baseUrl = `${this.options.secure ? 'https://' : 'http://'}${this.options.host}:${this.options.port}`
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
      .query({ type: this.options.type })

    return res.body.tmpDir
  }

  /**
   * Get the version of the IPFS Daemon.
   *
   * @returns {Promise}
   */
  async version () {
    const res = await request
      .get(`${this.baseUrl}/version`)
      .query({ type: this.options.type })

    return res.body.version
  }

  /**
   * Spawn a remote daemon using ipfs-http-client
   *
   * @param {IpfsOptions} [options={}] - Same as js-ipfs https://github.com/ipfs/js-ipfs#ipfs-constructor
   * @return {Promise}
   */
  async spawn (options = {}) {
    const ipfsOptions = merge({
      start: this.options.disposable !== false,
      init: this.options.disposable !== false,
      config: defaultConfig
    },
    this.options.ipfsOptions,
    options)

    if (this.options.defaultAddrs) {
      delete ipfsOptions.config.Addresses
    }

    const res = await request
      .post(`${this.baseUrl}/spawn`)
      .send(merge(
        {
          ipfsOptions
        },
        this.options
      ))

    const ipfsd = new DaemonClient(
      this.baseUrl,
      res.body,
      merge(
        {
          ipfsOptions
        },
        this.options
      )
    )

    return ipfsd
  }
}

module.exports = FactoryClient
