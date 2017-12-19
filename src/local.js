'use strict'

const defaults = require('lodash.defaultsdeep')
const waterfall = require('async/waterfall')
const join = require('path').join
const flatten = require('./utils').flatten

const Node = require('./daemon')

const defaultOptions = {
  type: 'go',
  disposable: true,
  start: true,
  init: true
}

const defaultConfig = {
  'API.HTTPHeaders.Access-Control-Allow-Origin': ['*'],
  'API.HTTPHeaders.Access-Control-Allow-Methods': [
    'PUT',
    'POST',
    'GET'
  ],
  'Addresses.Swarm': [`/ip4/127.0.0.1/tcp/0`],
  'Addresses.API': `/ip4/127.0.0.1/tcp/0`,
  'Addresses.Gateway': `/ip4/127.0.0.1/tcp/0`
}

/**
 * Control go-ipfs nodes directly from JavaScript.
 *
 * @namespace IpfsDaemonController
 */
const IpfsDaemonController = {
  /**
   * Get the version of the currently used go-ipfs binary.
   *
   * @memberof IpfsDaemonController
   * @param {Object} [opts={}]
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  version (opts, callback) {
    (new Node(opts)).version(callback)
  },

  /**
   * Spawn an IPFS node, either js-ipfs or go-ipfs
   *
   * Options are:
   * - `type` string (default 'go') - the type of the daemon to spawn, can be either 'go' or 'js'
   * - `init` bool - should the node be initialized
   * - `start` bool - should the node be started
   * - `repoPath` string - the repository path to use for this node, ignored if node is disposable
   * - `disposable` bool - a new repo is created and initialized for each invocation
   * - `config` - ipfs configuration options
   * - `args` - array of cmd line arguments to be passed to ipfs daemon
   * - `executable` - path to the desired IPFS executable to spawn
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
      delete defaultConfig['Addresses.Swarm']
      delete defaultConfig['Addresses.API']
      delete defaultConfig['Addresses.Gateway']

      options.init = false
      options.repoPath = options.repoPath || (process.env.IPFS_PATH ||
        join(process.env.HOME ||
          process.env.USERPROFILE, options.isJs ? '.jsipfs' : '.ipfs'))
    }

    options.config = flatten(opts.config)
    options.config = defaults({}, options.config, defaultConfig)

    const node = new Node(options)

    waterfall([
      (cb) => options.init ? node.init(cb) : cb(null, node),
      (node, cb) => options.start ? node.start(options.args, cb) : cb(null, null)
    ], (err, api) => {
      if (err) {
        return callback(err)
      }

      callback(null, node)
    })
  }
}

module.exports = IpfsDaemonController
