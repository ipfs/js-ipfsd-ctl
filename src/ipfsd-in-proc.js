'use strict'

const multiaddr = require('multiaddr')
const IpfsApi = require('ipfs-api')
const defaultsDeep = require('lodash.defaultsdeep')
const defaults = require('lodash.defaults')
const waterfall = require('async/waterfall')
const tmpDir = require('./utils/tmp-dir')
const { repoExists, removeRepo, checkForRunningApi, defaultRepo } = require('./utils/repo/nodejs')

/**
 * ipfsd for a js-ipfs instance (aka in-process IPFS node)
 *
 * @param {Object} [opts]
 * @param {Object} [opts.env={}] - Additional environment settings, passed to executing shell.
 */
class InProc {
  constructor (opts = {}) {
    this.opts = opts

    this.opts.args = this.opts.args || []
    this.path = this.opts.disposable
      ? tmpDir(this.opts.type === 'js')
      : (this.opts.repoPath || defaultRepo(this.opts.type))
    this.bits = this.opts.initOptions ? this.opts.initOptions.bits : null
    this.disposable = this.opts.disposable
    this.initialized = false
    this.started = false
    this.clean = true
    this.api = null
    this.apiAddr = null
    this.gatewayAddr = null

    this.opts.EXPERIMENTAL = defaultsDeep({}, opts.EXPERIMENTAL, {
      pubsub: false,
      sharding: false,
      relay: {
        enabled: false,
        hop: {
          enabled: false
        }
      },
      mfs: false
    })

    this.opts.args.forEach((arg) => {
      if (arg === '--enable-pubsub-experiment') {
        this.opts.EXPERIMENTAL.pubsub = true
      } else if (arg === '--enable-sharding-experiment') {
        this.opts.EXPERIMENTAL.sharding = true
      } else if (arg === '--enable-namesys-pubsub') {
        this.opts.EXPERIMENTAL.ipnsPubsub = true
      } else if (arg === '--enable-dht-experiment') {
        this.opts.EXPERIMENTAL.dht = true
      } else if (arg.startsWith('--pass')) {
        this.opts.pass = arg.split(' ').slice(1).join(' ')
      } else {
        throw new Error(`Unknown argument ${arg}`)
      }
    })
  }

  setExec (cb) {
    if (this.api !== null) {
      return setImmediate(() => cb(null, this))
    }
    const IPFS = this.opts.exec
    this.api = new IPFS({
      repo: this.path,
      init: false,
      start: false,
      pass: this.opts.pass,
      EXPERIMENTAL: this.opts.EXPERIMENTAL,
      libp2p: this.opts.libp2p,
      config: this.opts.config
    })
    this.api.once('error', cb)
    this.api.once('ready', () => cb(null, this))
  }

  setApi (addr) {
    this.apiAddr = multiaddr(addr)
    this.api = (this.opts.IpfsApi || IpfsApi)(addr)
    // TODO find out why we set this
    this.api.apiHost = this.apiAddr.nodeAddress().address
    this.api.apiPort = this.apiAddr.nodeAddress().port
  }

  setGateway (addr) {
    this.gatewayAddr = multiaddr(addr)
    // TODO find out why we set this
    this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
    this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
  }

  /**
   * Get the current repo path
   *
   * @member {string}
   */
  get repoPath () {
    return this.path
  }

  /**
   * Is the environment
   *
   * @member {Object}
   */
  get env () {
    throw new Error('Not implemented!')
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOptions={}]
   * @param {number} [initOptions.bits=2048] - The bit size of the identiy key.
   * @param {string} [initOptions.directory=IPFS_PATH] - The location of the repo.
   * @param {string} [initOptions.pass] - The passphrase of the keychain.
   * @param {function (Error, InProc): void} callback
   */
  init (initOptions, callback) {
    if (typeof initOptions === 'function') {
      callback = initOptions
      initOptions = null
    }

    repoExists(this.path, (b, initialized) => {
      if (initialized && initOptions) {
        return callback(new Error(`Repo already initialized can't use different options, ${JSON.stringify(initOptions)}`))
      }

      if (initialized) {
        this.initialized = true
        this.clean = false
        return callback(null, this)
      }

      // Repo not initialized
      initOptions = initOptions || {}

      waterfall([
        cb => this.setExec(cb),
        (ipfsd, cb) => this.api.init(initOptions, cb),
        (init, cb) => this.getConfig(cb),
        (conf, cb) => this.replaceConfig(defaults({}, this.opts.config, conf), cb)
      ], (err) => {
        if (err) { return callback(err) }
        this.clean = false
        this.initialized = true
        return callback(null, this)
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

    this.clean = true
    removeRepo(this.path, callback)
  }

  /**
   * Start the daemon.
   *
   * @param {Array<string>} [flags=[]] - Flags to be passed to the `ipfs daemon` command.
   * @param {function(Error, IpfsClient)} callback
   * @returns {undefined}
   */
  start (flags, callback) {
    if (typeof flags === 'function') {
      callback = flags
      flags = undefined // not used
    }

    // Check if a daemon is already running
    const api = checkForRunningApi(this.path)
    if (api) {
      this.setApi(api)
      this.started = true
      return callback(null, this.api)
    }

    waterfall([
      cb => this.setExec(cb),
      (ipfsd, cb) => this.api.start(cb)
    ], (err) => {
      if (err) { return callback(err) }

      callback(null, this.api)
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

    if (!this.api) {
      return callback()
    }

    this.api.stop((err) => {
      if (err) {
        return callback(err)
      }

      this.started = false
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
   * @returns {undefined}
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

    this.api.config.get(key, callback)
  }

  /**
   * Set a config value.
   *
   * @param {string} key
   * @param {string} value
   * @param {function(Error)} callback
   */
  setConfig (key, value, callback) {
    this.api.config.set(key, value, callback)
  }

  /**
   * Replace the current config with the provided one
   *
   * @param {Object} config
   * @param {function(Error)} callback
   */
  replaceConfig (config, callback) {
    this.api.config.replace(config, callback)
  }

  /**
   * Get the version of ipfs
   *
   * @param {function(Error, string)} callback
   */
  version (callback) {
    waterfall([
      cb => this.setExec(cb),
      (ipfsd, cb) => this.api.version(cb)
    ], callback)
  }
}

module.exports = InProc
