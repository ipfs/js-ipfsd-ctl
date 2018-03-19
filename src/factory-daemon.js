'use strict'

const defaultsDeep = require('lodash.defaultsdeep')
const clone = require('lodash.clone')
const series = require('async/series')
const path = require('path')
const tmpDir = require('./utils/tmp-dir')

const Daemon = require('./ipfsd-daemon')
const defaultConfig = require('./defaults/config')
const defaultOptions = require('./defaults/options')

// TODO extract common functionality into base class

/**
 * Spawn IPFS Daemons (either JS or Go)
 *
 * @namespace FactoryDaemon
 */
class FactoryDaemon {
  /**
   *
   * @param {Object} options
   *  - `type` string - 'go' or 'js'
   *  - `exec` string (optional) - the path of the daemon executable
   * @return {*}
   */
  constructor (options) {
    if (options && options.type === 'proc') {
      throw new Error('This Factory does not know how to spawn in proc nodes')
    }
    options = Object.assign({}, { type: 'go' }, options)
    this.type = options.type
    this.exec = options.exec
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   *
   * *Here for completeness*
   *
   * @param {String} type - the type of the node
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  tmpDir (type, callback) {
    callback(null, tmpDir(type === 'js'))
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
      options = {}
    }
    options = Object.assign({}, options, { type: this.type, exec: this.exec })
    // TODO: (1) this should check to see if it is looking for Go or JS
    // TODO: (2) This spawns a whole daemon just to get his version? There is
    // a way to get the version while the daemon is offline...
    const d = new Daemon(options)
    d.version(callback)
  }

  /**
   * Spawn an IPFS node, either js-ipfs or go-ipfs
   *
   * Options are:
   * - `init` bool - should the node be initialized
   * - `initOptions` Object, it is expected to be of the form `{bits: <size>}`, which sets the desired key size
   * - `start` bool - should the node be started
   * - `repoPath` string - the repository path to use for this node, ignored if node is disposable
   * - `disposable` bool - a new repo is created and initialized for each invocation
   * - `defaultAddrs` bool (default false) - use the daemon default `Swarm` addrs
   * - `config` - ipfs configuration options
   * - `args` - array of cmd line arguments to be passed to ipfs daemon
   * - `exec` string (optional) - path to the desired IPFS executable to spawn,
   * this will override the `exec` set when creating the daemon controller factory instance
   *
   * @param {Object} [options={}] - various config options and ipfs config parameters
   * @param {Function} callback(err, [`ipfs-api instance`, `Node (ctrl) instance`]) - a callback that receives an array with an `ipfs-instance` attached to the node and a `Node`
   * @return {undefined}
   */
  spawn (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    // TODO this options parsing is daunting. Refactor and move to a separate
    // func documenting what it is trying to do.
    options = defaultsDeep({}, options, defaultOptions)

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

    options.type = this.type
    options.exec = options.exec || this.exec

    const node = new Daemon(options)

    series([
      (cb) => options.init
        ? node.init(cb)
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
