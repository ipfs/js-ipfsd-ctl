'use strict'

const defaultsDeep = require('lodash.defaultsdeep')
const clone = require('lodash.clone')
const series = require('async/series')
const path = require('path')
const tmpDir = require('./utils/tmp-dir')
const Daemon = require('./ipfsd-daemon')
const defaultConfig = require('./defaults/config.json')
const defaultOptions = require('./defaults/options.json')

/** @ignore @typedef {import("./index").SpawnOptions} SpawnOptions */

/**
 * Creates an instance of FactoryDaemon.
 *
 * @param {Object} options
 * @param {string} [options.type='go'] - 'go' or 'js'
 * @param {string} [options.exec] - the path of the daemon executable
 */
class FactoryDaemon {
  constructor (options) {
    if (options && options.type === 'proc') {
      throw new Error('This Factory does not know how to spawn in proc nodes')
    }
    this.options = Object.assign({}, { type: 'go' }, options)
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   *
   * *Here for completeness*
   *
   * @param {String} type - the type of the node
   * @param {function(Error, string): void} callback
   * @returns {void}
   */
  tmpDir (type, callback) {
    callback(null, tmpDir(type === 'js'))
  }

  /**
   * Get the version of the IPFS Daemon.
   *
   * @param {Object} [options={}]
   * @param {function(Error, (string|Object)): void} callback - Receives `Error` or `version` that might be one of the following:
   * - if type is `go` a version string like `ipfs version <version number>`
   * - if type is `js` a version string like `js-ipfs version <version number>`
   * - if type is `proc` an object with the following properties:
   *    - version - the ipfs version
   *    - repo - the repo version
   *    - commit - the commit hash for this version
   * @returns {void}
   */
  version (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    options = Object.assign(
      { IpfsClient: this.options.IpfsClient },
      options,
      { type: this.options.type, exec: this.options.exec }
    )
    // TODO: (1) this should check to see if it is looking for Go or JS
    // TODO: (2) This spawns a whole daemon just to get his version? There is
    // a way to get the version while the daemon is offline...
    const d = new Daemon(options)
    d.version(callback)
  }

  /**
   * Spawn an IPFS node, either js-ipfs or go-ipfs
   *
   * @param {SpawnOptions} [options={}] - Various config options and ipfs config parameters
   * @param {function(Error, Daemon): void} callback - Callback receives Error or a Daemon instance, Daemon has a `api` property which is an `ipfs-http-client` instance.
   * @returns {void}
   */
  spawn (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    // TODO this options parsing is daunting. Refactor and move to a separate
    // func documenting what it is trying to do.
    options = defaultsDeep(
      { IpfsClient: this.options.IpfsClient },
      options,
      defaultOptions
    )

    options.init = typeof options.init !== 'undefined'
      ? options.init
      : true

    if (!options.disposable) {
      const nonDisposableConfig = clone(defaultConfig)
      options.init = false
      options.start = false

      const defaultRepo = path.join(
        process.env.HOME || process.env.USERPROFILE,
        options.isJs
          ? '.jsipfs'
          : '.ipfs'
      )

      options.repoPath = options.repoPath ||
        (process.env.IPFS_PATH || defaultRepo)
      options.config = defaultsDeep({}, options.config, nonDisposableConfig)
    } else {
      options.config = defaultsDeep({}, options.config, defaultConfig)
    }

    if (options.defaultAddrs) {
      delete options.config.Addresses
    }

    options.type = this.options.type
    options.exec = options.exec || this.options.exec
    options.initOptions = defaultsDeep({}, this.options.initOptions, options.initOptions)

    const node = new Daemon(options)

    series([
      (cb) => options.init
        ? node.init(options.initOptions, cb)
        : cb(null, node),
      (cb) => options.start
        ? node.start(options.args, cb)
        : cb()
    ], (err) => {
      if (err) { return callback(err) }

      callback(null, node)
    })
  }
}

module.exports = FactoryDaemon
