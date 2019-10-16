'use strict'

const tmpDir = require('./utils/tmp-dir')
const Daemon = require('./ipfsd-daemon')
const merge = require('merge-options')
const defaultConfig = require('./defaults/config.json')
const findBin = require('./utils/find-ipfs-executable')
const { defaultRepo } = require('./utils/repo')
const fs = require('fs')

/** @ignore @typedef {import("./index").IpfsOptions} IpfsOptions */
/** @ignore @typedef {import("./index").FactoryOptions} FactoryOptions */

/**
 * Creates an instance of FactoryDaemon.
 */
class FactoryDaemon {
  /**
   * @param {FactoryOptions} options
   */
  constructor (options) {
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
      },
      ipfsBin: findBin(options.type || 'go')
    }, options)

    this.options.ipfsHttp.path = fs.realpathSync(this.options.ipfsHttp.path)
    this.options.ipfsApi.path = fs.realpathSync(this.options.ipfsApi.path)
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
   * Get the version of the IPFS Daemon.
   *
   * @returns {Promise} - Resolves to `version` that might be one of the following:
   * - if type is `go` a version string like `ipfs version <version number>`
   * - if type is `js` a version string like `js-ipfs version <version number>`
   * - if type is `proc` an object with the following properties:
   *    - version - the ipfs version
   *    - repo - the repo version
   *    - commit - the commit hash for this version
   */
  version () {
    // TODO: (1) this should check to see if it is looking for Go or JS
    // TODO: (2) This spawns a whole daemon just to get his version? There is
    // a way to get the version while the daemon is offline...
    const d = new Daemon(merge({
      ipfsOptions: {
        start: true,
        init: true,
        config: defaultConfig,
        repo: tmpDir(this.options.type)
      }
    }, this.options))
    return d.version()
  }

  /**
   * Spawn an IPFS node, either js-ipfs or go-ipfs
   *
   * @param {IpfsOptions} [options={}] - Various config options and ipfs config parameters
   * @returns {Promise<Daemon>}
   */
  async spawn (options = {}) {
    const ipfsOptions = merge(
      {
        start: this.options.disposable !== false,
        init: this.options.disposable !== false,
        config: defaultConfig,
        repo: this.options.disposable
          ? tmpDir(this.options.type)
          : defaultRepo(this.options.type)
      },
      this.options.ipfsOptions,
      options
    )

    if (this.options.defaultAddrs) {
      delete ipfsOptions.config.Addresses
    }

    const node = new Daemon(merge({
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

module.exports = FactoryDaemon
