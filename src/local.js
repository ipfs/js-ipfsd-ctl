'use strict'

const merge = require('lodash.merge')
const waterfall = require('async/waterfall')

const Node = require('./daemon')

const defaultOptions = {
  config: {
    'API.HTTPHeaders.Access-Control-Allow-Origin': ['*'],
    'API.HTTPHeaders.Access-Control-Allow-Methods': [
      'PUT',
      'POST',
      'GET'
    ]
  },
  disposable: true,
  start: true,
  init: true
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
   * - `js` bool - spawn a js or go node (default go)
   * - `init` bool - should the node be initialized
   * - `start` bool - should the node be started
   * - `repoPath` string - the repository path to use for this node, ignored if node is disposable
   * - `disposable` bool - a new repo is created and initialized for each invocation
   * - `config` - ipfs configuration options
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
    merge(options, defaultOptions, opts || {})
    options.init = (typeof options.init !== 'undefined' ? options.init : true)
    options.start = options.init && options.start // don't start if not initialized

    const node = new Node(options)

    waterfall([
      (cb) => options.init ? node.init(cb) : cb(null, node),
      (node, cb) => options.start ? node.startDaemon(cb) : cb(null, null)
    ], (err, api) => {
      if (err) {
        return callback(err)
      }

      callback(null, { ctl: api, ctrl: node })
    })
  }
}

module.exports = IpfsDaemonController
