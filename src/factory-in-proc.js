'use strict'

const tmpDir = require('./utils/tmp-dir')
const InProc = require('./ipfsd-in-proc')
const merge = require('merge-options')
const defaultConfig = require('./defaults/config.json')
const { defaultRepo } = require('./utils/repo')

/** @ignore @typedef {import("./index").IpfsOptions} IpfsOptions */
/** @ignore @typedef {import("./index").FactoryOptions} FactoryOptions */

/**
 * Factory to spawn in-proc JS-IPFS instances (aka in process nodes)
 */
class FactoryInProc {
  /**
   * @param {FactoryOptions} options
   */
  constructor (options) {
    /** @type FactoryOptions */
    this.options = merge({
      host: 'localhost',
      port: 43134,
      secure: false,
      type: 'js',
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
      // ipfsBin: findBin(options.type || 'js')
    }, options)
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   *
   * @returns {Promise}
   */
  tmpDir () {
    return Promise.resolve(tmpDir(this.options.type))
  }

  /**
   * Get the version of the currently used go-ipfs binary.
   *
   * @returns {Promise}
   */
  async version () {
    const node = new InProc(merge({
      ipfsOptions: {
        start: true,
        init: true,
        config: defaultConfig,
        repo: tmpDir(this.options.type)
      }
    }, this.options))
    const v = await node.version()
    return v
  }

  /**
   * Spawn JSIPFS instances
   *
   * @param {IpfsOptions} [options={}] - various config options and ipfs config parameters
   * @returns {Promise<InProc>} - Resolves to an array with an `ipfs-instance` attached to the node and a `Node`
   */
  async spawn (options = {}) {
    const ipfsOptions = merge({
      silent: true,
      start: this.options.disposable !== false,
      init: this.options.disposable !== false,
      config: defaultConfig,
      repo: this.options.disposable
        ? tmpDir(this.options.type)
        : defaultRepo(this.options.type)
    },
    this.options.ipfsOptions,
    options)

    if (this.options.defaultAddrs) {
      delete ipfsOptions.config.Addresses
    }

    const node = new InProc(merge({
      ipfsOptions
    }, this.options))

    if (ipfsOptions.init) {
      await node.init(ipfsOptions.init)
    }

    if (ipfsOptions.start) {
      await node.start()
    }

    return node
  }
}

module.exports = FactoryInProc
