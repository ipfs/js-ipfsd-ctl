'use strict'

const createRepo = require('./utils').createRepo
const multiaddr = require('multiaddr')
const flatten = require('./utils').flatten
const async = require('async')
const defaults = require('lodash.defaultsdeep')

/**
 * Controll a go-ipfs or js-ipfs node.
 */
class Node {
  /**
   * Create a new node.
   *
   * @param {Object} [opts]
   * @param {Object} [opts.env={}] - Additional environment settings, passed to executing shell.
   * @returns {Node}
   */
  constructor (opts) {
    this.opts = opts || {}

    const IPFS = this.opts.exec

    this.opts.args = this.opts.args || []
    this.path = this.opts.repoPath
    this.repo = createRepo(this.path)
    this.disposable = this.opts.disposable
    this.clean = true
    this._apiAddr = null
    this._gatewayAddr = null
    this._started = false
    this.initialized = false
    this.api = null

    this.opts.EXPERIMENTAL = defaults({}, opts.EXPERIMENTAL, {
      pubsub: false,
      sharding: false,
      relay: {
        enabled: false,
        hop: {
          enabled: false
        }
      }
    })

    this.opts.args.forEach((arg) => {
      if (arg === '--enable-pubsub-experiment') {
        this.opts.EXPERIMENTAL.pubsub = true
      } else if (arg === '--enable-sharding-experiment') {
        this.opts.EXPERIMENTAL.sharding = true
      } else if (arg.startsWith('--pass')) {
        this.opts.pass = arg.split(' ').slice(1).join(' ')
      } else {
        throw new Error('Unkown argument ' + arg)
      }
    })
    this.exec = new IPFS({
      repo: this.repo,
      init: false,
      start: false,
      pass: this.opts.pass,
      EXPERIMENTAL: this.opts.EXPERIMENTAL,
      libp2p: this.opts.libp2p
    })
  }

  /**
   * Get the address of connected IPFS API.
   *
   * @returns {Multiaddr}
   */
  get apiAddr () {
    return this._apiAddr
  }

  /**
   * Get the address of connected IPFS HTTP Gateway.
   *
   * @returns {Multiaddr}
   */
  get gatewayAddr () {
    return this._gatewayAddr
  }

  /**
   * Get the current repo path
   *
   * @return {string}
   */
  get repoPath () {
    return this.path
  }

  /**
   * Is the node started
   *
   * @return {boolean}
   */
  get started () {
    return this._started
  }

  /**
   * Is the environment
   *
   * @return {object}
   */
  get env () {
    throw new Error('Not implemented!')
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOpts={}]
   * @param {number} [initOpts.keysize=2048] - The bit size of the identiy key.
   * @param {string} [initOpts.directory=IPFS_PATH] - The location of the repo.
   * @param {string} [initOpts.pass] - The passphrase of the keychain.
   * @param {function (Error, Node)} callback
   * @returns {undefined}
   */
  init (initOpts, callback) {
    if (!callback) {
      callback = initOpts
      initOpts = {}
    }

    initOpts.bits = initOpts.keysize || 2048
    this.exec.init(initOpts, (err) => {
      if (err) {
        return callback(err)
      }

      const conf = flatten(this.opts.config)
      async.eachOf(conf, (val, key, cb) => {
        this.setConfig(key, val, cb)
      }, (err) => {
        if (err) {
          return callback(err)
        }

        this.initialized = true
        callback(null, this)
      })
    })
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @param {function(Error)} callback
   * @returns {undefined}
   */
  cleanup (callback) {
    if (this.clean) {
      return callback()
    }

    this.repo.teardown(callback)
  }

  /**
   * Start the daemon.
   *
   * @param {Array<string>} [flags=[]] - Flags to be passed to the `ipfs daemon` command.
   * @param {function(Error, IpfsApi)} callback
   * @returns {undefined}
   */
  start (flags, callback) {
    if (typeof flags === 'function') {
      callback = flags
      flags = undefined // not used
    }

    this.exec.start((err) => {
      if (err) {
        return callback(err)
      }

      this._started = true
      this.api = this.exec
      this.exec.config.get((err, conf) => {
        if (err) {
          return callback(err)
        }

        this._apiAddr = conf.Addresses.API
        this._gatewayAddr = conf.Addresses.Gateway

        this.api.apiHost = multiaddr(conf.Addresses.API).nodeAddress().host
        this.api.apiPort = multiaddr(conf.Addresses.API).nodeAddress().port

        callback(null, this.api)
      })
    })
  }

  /**
   * Stop the daemon.
   *
   * @param {function(Error)} [callback]
   * @returns {undefined}
   */
  stop (callback) {
    callback = callback || function noop () {}

    if (!this.exec) {
      return callback()
    }

    this.exec.stop((err) => {
      if (err) {
        return callback(err)
      }

      this._started = false
      if (this.disposable) {
        return this.cleanup(callback)
      }

      return callback()
    })
  }

  /**
   * Kill the `ipfs daemon` process.
   *
   * First `SIGTERM` is sent, after 10.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   *
   * @param {function()} callback - Called when the process was killed.
   * @returns {undefined}
   */
  killProcess (callback) {
    this.stop(callback)
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {number}
   */
  pid () {
    throw new Error('not implemented')
  }

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   *
   * @param {string} [key] - A specific config to retrieve.
   * @param {function(Error, (Object|string))} callback
   * @returns {undefined}
   */
  getConfig (key, callback) {
    if (typeof key === 'function') {
      callback = key
      key = undefined
    }

    this.exec.config.get(key, callback)
  }

  /**
   * Set a config value.
   *
   * @param {string} key
   * @param {string} value
   * @param {function(Error)} callback
   * @returns {undefined}
   */
  setConfig (key, value, callback) {
    this.exec.config.set(key, value, callback)
  }

  /**
   * Get the version of ipfs
   *
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  version (callback) {
    this.exec.version(callback)
  }
}

module.exports = Node
