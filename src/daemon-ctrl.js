'use strict'

const defaults = require('lodash.defaultsdeep')
const clone = require('lodash.clone')
const waterfall = require('async/waterfall')
const join = require('path').join

const Node = require('./daemon-node')
const ProcNode = require('./in-proc-node')

const defaultOptions = {
  type: 'go',
  disposable: true,
  start: true,
  init: true
}

const defaultConfig = {
  API: {
    HTTPHeaders: {
      'Access-Control-Allow-Origin': ['*'],
      'Access-Control-Allow-Methods': [
        'PUT',
        'POST',
        'GET'
      ]
    }
  },
  Addresses: {
    Swarm: [`/ip4/127.0.0.1/tcp/0`],
    API: `/ip4/127.0.0.1/tcp/0`,
    Gateway: `/ip4/127.0.0.1/tcp/0`
  }
}

/**
 * Control go-ipfs nodes directly from JavaScript.
 *
 * @namespace DaemonController
 */
class DaemonController {
  constructor (type) {
    this.type = type || 'go'
  }

  /**
   * Get the version of the currently used go-ipfs binary.
   *
   * @memberof IpfsDaemonController
   * @param {Object} [opts={}]
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  version (opts, callback) {
    opts = opts || {}
    opts.type = this.type
    const node = new Node(opts)
    node.version(callback)
  }

  /**
   * Spawn an IPFS node, either js-ipfs or go-ipfs
   *
   * Options are:
   * - `init` bool - should the node be initialized
   * - `start` bool - should the node be started
   * - `repoPath` string - the repository path to use for this node, ignored if node is disposable
   * - `disposable` bool - a new repo is created and initialized for each invocation
   * - `config` - ipfs configuration options
   * - `args` - array of cmd line arguments to be passed to ipfs daemon
   * - `exec` - path to the desired IPFS executable to spawn
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

    let options = {}
    options = defaults({}, opts, defaultOptions)
    options.init = (typeof options.init !== 'undefined' ? options.init : true)
    if (!options.disposable) {
      const nonDisposableConfig = clone(defaultConfig)
      delete nonDisposableConfig['Addresses']

      options.init = false
      options.start = false

      const defaultRepo = join(process.env.HOME || process.env.USERPROFILE,
        options.isJs ? '.jsipfs' : '.ipfs')
      options.repoPath = options.repoPath || (process.env.IPFS_PATH || defaultRepo)
      options.config = defaults({}, options.config, nonDisposableConfig)
    } else {
      options.config = defaults({}, options.config, defaultConfig)
    }

    let node
    options.type = this.type
    if (this.type === 'proc') {
      if (typeof options.exec !== 'function') {
        return callback(new Error(`'type' proc requires 'exec' to be a coderef`))
      }

      node = new ProcNode(options)
    } else {
      node = new Node(options)
    }

    waterfall([
      (cb) => options.init ? node.init(cb) : cb(null, node),
      (node, cb) => options.start ? node.start(options.args, cb) : cb(null, null)
    ], (err) => {
      if (err) {
        return callback(err)
      }

      callback(null, node)
    })
  }
}

module.exports = DaemonController
