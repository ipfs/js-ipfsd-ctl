'use strict'

const os = require('os')
const join = require('path').join

const Node = require('./node')

const defaultOptions = {
  'Addresses.Swarm': ['/ip4/0.0.0.0/tcp/0'],
  'Addresses.Gateway': '',
  'Addresses.API': '/ip4/127.0.0.1/tcp/0',
  disposable: true,
  init: true
}

function tempDir () {
  return join(os.tmpdir(), `ipfs_${String(Math.random()).substr(2)}`)
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
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  version (callback) {
    (new Node()).version(callback)
  },
  /**
   * Create a new local node.
   *
   * @memberof IpfsDaemonController
   * @param {string} [path] - Location of the repo. Defaults to `$IPFS_PATH`, or `$HOME/.ipfs`, or `$USER_PROFILE/.ipfs`.
   * @param {Object} [opts={}]
   * @param {function(Error, Node)} callback
   * @returns {undefined}
   */
  local (path, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }
    if (!callback) {
      callback = path
      path = process.env.IPFS_PATH ||
        join(process.env.HOME ||
             process.env.USERPROFILE, '.ipfs')
    }
    process.nextTick(() => {
      callback(null, new Node(path, opts))
    })
  },
  /**
   * Create a new disposable node and already start the daemon.
   *
   * @memberof IpfsDaemonController
   * @param {Object} [opts={}]
   * @param {function(Error, Node)} callback
   * @returns {undefined}
   */
  disposableApi (opts, callback) {
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }
    this.disposable(opts, (err, node) => {
      if (err) {
        return callback(err)
      }

      node.startDaemon(callback)
    })
  },
  /**
   * Create a new disposable node.
   * This means the repo is created in a temporary location and cleaned up on process exit.
   *
   * @memberof IpfsDaemonController
   * @param {Object} [opts={}]
   * @param {function(Error, Node)} callback
   * @returns {undefined}
   */
  disposable (opts, callback) {
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }

    let options = {}
    Object.assign(options, defaultOptions, opts || {})

    const repoPath = options.repoPath || tempDir()
    const disposable = options.disposable
    delete options.disposable
    delete options.repoPath

    const node = new Node(repoPath, options, disposable)

    if (typeof options.init === 'boolean' &&
        options.init === false) {
      process.nextTick(() => callback(null, node))
    } else {
      node.init((err) => callback(err, node))
    }
  }
}

module.exports = IpfsDaemonController
