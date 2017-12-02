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
   * Spawn an IPFS node
   * The repo is created in a temporary location and cleaned up on process exit.
   *
   * @memberof IpfsDaemonController
   * @param {Object} [opts={}]
   * @param {function(Error, {ctl: IpfsApi, ctrl: Node})} callback
   * @returns {undefined}
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
