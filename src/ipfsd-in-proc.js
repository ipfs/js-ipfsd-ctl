'use strict'

const multiaddr = require('multiaddr')
const defaultsDeep = require('lodash.defaultsdeep')
const defaults = require('lodash.defaults')
const waterfall = require('async/waterfall')
const debug = require('debug')
const EventEmitter = require('events')
const repoUtils = require('./utils/repo/nodejs')

const log = debug('ipfsd-ctl:in-proc')

let IPFS = null

/**
 * ipfsd for a js-ipfs instance (aka in-process IPFS node)
 *
 * @param {Object} [opts]
 * @param {Object} [opts.env={}] - Additional environment settings, passed to executing shell.
 */
class InProc extends EventEmitter {
  constructor (opts) {
    super()
    this.opts = opts || {}

    IPFS = this.opts.exec

    this.opts.args = this.opts.args || []
    this.path = this.opts.repoPath || repoUtils.createTempRepoPath()
    this.disposable = this.opts.disposable
    this.clean = true
    this._apiAddr = null
    this._gatewayAddr = null
    this._started = false
    this.api = null
    this.initialized = false
    this.bits = this.opts.initOptions ? this.opts.initOptions.bits : null

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
      } else if (arg.startsWith('--pass')) {
        this.opts.pass = arg.split(' ').slice(1).join(' ')
      } else {
        throw new Error(`Unknown argument ${arg}`)
      }
    })

    this.exec = new IPFS({
      repo: this.path,
      init: false,
      start: false,
      pass: this.opts.pass,
      EXPERIMENTAL: this.opts.EXPERIMENTAL,
      libp2p: this.opts.libp2p,
      config: this.opts.config
    })

    // TODO: should this be wrapped in a process.nextTick(), for context:
    // https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/#why-use-process-nexttick
    this.exec.once('error', err => this.emit('error', err))
    this.exec.once('ready', () => this.emit('ready'))
  }

  /**
   * Get the address of connected IPFS API.
   *
   * @member {Multiaddr}
   */
  get apiAddr () {
    return this._apiAddr
  }

  /**
   * Get the address of connected IPFS HTTP Gateway.
   *
   * @member {Multiaddr}
   */
  get gatewayAddr () {
    return this._gatewayAddr
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
   * Is the node started
   *
   * @member {boolean}
   */
  get started () {
    return this._started
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
   * @param {function (Error, InProc)} callback
   * @returns {undefined}
   */
  init (initOptions, callback) {
    if (typeof initOptions === 'function') {
      callback = initOptions
      initOptions = {}
    }

    const bits = initOptions.keysize ? initOptions.bits : this.bits
    // do not just set a default keysize,
    // in case we decide to change it at
    // the daemon level in the future
    if (bits) {
      initOptions.bits = bits
      log(`initializing with keysize: ${bits}`)
    }
    this.exec.init(initOptions, (err) => {
      if (err) {
        return callback(err)
      }

      const self = this
      waterfall([
        (cb) => this.getConfig(cb),
        (conf, cb) => this.replaceConfig(defaults({}, this.opts.config, conf), cb)
      ], (err) => {
        if (err) { return callback(err) }
        self.clean = false
        self.initialized = true
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

    repoUtils.removeRepo(this.path, callback)
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
   * Replace the current config with the provided one
   *
   * @param {Object} config
   * @param {function(Error)} callback
   * @return {undefined}
   */
  replaceConfig (config, callback) {
    this.exec.config.replace(config, callback)
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

module.exports = InProc
