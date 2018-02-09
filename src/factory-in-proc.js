'use strict'

const defaults = require('lodash.defaultsdeep')
const clone = require('lodash.clone')
const waterfall = require('async/waterfall')
const path = require('path')

const Node = require('./ipfsd-in-proc')
const defaultConfig = require('./defaults/config')
const defaultOptions = require('./defaults/options')

/**
 * Spawn JSIPFS instances (aka in process nodes)
 *
 * @namespace FactoryInProc
 */
class FactoryInProc {
  /**
   * Create a FactoryInProc
   *
   * @param {Object} opts
   *  - `type` string - one of 'go', 'js' or 'proc',
   *  the type of the daemon to spawn
   *  - `exec` string (optional) - the path of the daemon
   *  executable or IPFS class in the case of `proc`
   *
   * @return {*}
   */
  constructor (options) {
    if (options.type !== 'proc') {
      throw new Error('This Factory only knows how to create in proc nodes')
    }
    this.type = options.type
    this.exec = options.exec
  }

  /**
   * Get the version of the currently used go-ipfs binary.
   *
   * @memberof FactoryInProc
   * @param {Object} [options={}]
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  version (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    const IPFS = options.exec
    new IPFS().version(options, callback)
  }

  /**
   * Spawn JSIPFS instances
   *
   * Options are:
   * - `init` bool - should the node be initialized
   * - `start` bool - should the node be started
   * - `repoPath` string - the repository path to use for this node, ignored if node is disposable
   * - `disposable` bool - a new repo is created and initialized for each invocation
   * - `config` - ipfs configuration options
   * - `args` - array of cmd line arguments to be passed to ipfs daemon
   * - `exec` string (optional) - path to the desired IPFS executable to spawn,
   * this will override the `exec` set when creating the daemon controller factory instance
   *
   * @param {Object} [opts={}] - various config options and ipfs config parameters
   * @param {Function} callback(err, [`ipfs-api instance`, `Node (ctrl) instance`]) - a callback that receives an array with an `ipfs-instance` attached to the node and a `Node`
   * @return {undefined}
   */
  spawn (opts, callback) {
    if (typeof opts === 'function') {
      callback = opts
      opts = defaultOptions
    }

    const options = defaults({}, opts, defaultOptions)

    options.init = typeof options.init !== 'undefined'
      ? options.init
      : true

    if (!options.disposable) {
      const nonDisposableConfig = clone(defaultConfig)
      delete nonDisposableConfig.Addresses

      options.init = false
      options.start = false

      const defaultRepo = path.join(
        process.env.HOME || process.env.USERPROFILE,
        options.isJs ? '.jsipfs' : '.ipfs'
      )

      options.repoPath = options.repoPath || (process.env.IPFS_PATH || defaultRepo)
      options.config = defaults({}, options.config, nonDisposableConfig)
    } else {
      options.config = defaults({}, options.config, defaultConfig)
    }

    let node
    options.type = this.type
    options.exec = options.exec || this.exec

    if (typeof options.exec !== 'function') {
      return callback(new Error(`'type' proc requires 'exec' to be a coderef`))
    }

    node = new Node(options)

    waterfall([
      (cb) => options.init
        ? node.init(cb)
        : cb(null, node),
      (node, cb) => options.start
        ? node.start(options.args, cb)
        : cb()
    ], (err) => {
      if (err) { return callback(err) }

      callback(null, node)
    })
  }
}

module.exports = FactoryInProc
