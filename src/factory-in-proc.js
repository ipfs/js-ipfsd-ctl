'use strict'

const defaults = require('lodash.defaultsdeep')
const clone = require('lodash.clone')
const series = require('async/series')
const path = require('path')
const tmpDir = require('./utils/tmp-dir')
const once = require('once')
const repoUtils = require('./utils/repo/nodejs')

const Node = require('./ipfsd-in-proc')
const defaultConfig = require('./defaults/config')
const defaultOptions = require('./defaults/options')

// TODO extract common functionality into base class

/**
 * Factory to spawn in-proc JS-IPFS instances (aka in process nodes)
 * @class
 * @param {Object} options
 * @param {String} [options.type='proc'] - one of 'go', 'js' or 'proc', in this case this needs to be 'proc'
 * @param {String} [options.exec] - the path of the daemon executable or IPFS class in the case of `proc`
 */
class FactoryInProc {
  constructor (options) {
    options = options || {}
    if (options.type !== 'proc') {
      throw new Error('This Factory only knows how to create in proc nodes')
    }
    this.options = options
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   *
   * *Here for completeness*
   *
   * @param {string} type - the type of the node
   * @param {function(err: Error, tmpDir: string)} callback
   */
  tmpDir (type, callback) {
    callback(null, tmpDir(true))
  }

  /**
   * Get the version of the currently used go-ipfs binary.
   *
   * @param {Object} [options={}]
   * @param {function(err: Error, version: string)} callback
   */
  version (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    const node = new Node(options)
    node.once('ready', () => {
      node.version(callback)
    })
  }

  /**
   * Spawn JSIPFS instances
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
   * @param {Object} [opts={}] - various config options and ipfs config parameters
   * @param {function(err: Error, ipfsd: Node)} callback - a callback that receives an array with an `ipfs-instance` attached to the node and a `Node`
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

    if (options.disposable) {
      options.config = defaults({}, options.config, defaultConfig)
    } else {
      const nonDisposableConfig = clone(defaultConfig)
      options.init = false
      options.start = false

      const defaultRepo = path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        options.isJs ? '.jsipfs' : '.ipfs'
      )

      options.repoPath = options.repoPath || (process.env.IPFS_PATH || defaultRepo)
      options.config = defaults({}, options.config, nonDisposableConfig)
    }

    if (options.defaultAddrs) {
      delete options.config.Addresses
    }

    options.type = this.options.type
    options.exec = options.exec || this.options.exec

    if (typeof options.exec !== 'function') {
      return callback(new Error(`'type' proc requires 'exec' to be a coderef`))
    }

    const node = new Node(options)
    const callbackOnce = once((err) => {
      if (err) {
        return callback(err)
      }
      callback(null, node)
    })
    node.once('error', callbackOnce)

    series([
      (cb) => node.once('ready', cb),
      (cb) => repoUtils.repoExists(node.path, (err, initialized) => {
        if (err) { return cb(err) }
        node.initialized = initialized
        cb()
      }),
      (cb) => options.init
        ? node.init(cb)
        : cb(),
      (cb) => options.start
        ? node.start(options.args, cb)
        : cb()
    ], callbackOnce)
  }
}

module.exports = FactoryInProc
