'use strict'

const multiaddr = require('multiaddr')
const defaultsDeep = require('lodash.defaultsdeep')
const defaults = require('lodash.defaults')
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
      sharding: false
    })

    this.opts.args.forEach((arg) => {
      if (arg === '--enable-sharding-experiment') {
        this.opts.EXPERIMENTAL.sharding = true
      } else if (arg === '--enable-namesys-pubsub') {
        this.opts.EXPERIMENTAL.ipnsPubsub = true
      } else if (arg === '--enable-dht-experiment') {
        this.opts.EXPERIMENTAL.dht = true
      } else if (arg === '--offline') {
        this.opts.offline = true
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
      offline: this.opts.offline,
      EXPERIMENTAL: this.opts.EXPERIMENTAL,
      libp2p: this.opts.libp2p,
      config: this.opts.config,
      relay: this.opts.relay,
      silent: this.opts.silent
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
   * @returns {Promise}
   */
  async init (initOptions = {}) {
    const bits = initOptions.keysize ? initOptions.bits : this.bits
    // do not just set a default keysize,
    // in case we decide to change it at
    // the daemon level in the future
    if (bits) {
      initOptions.bits = bits
      log(`initializing with keysize: ${bits}`)
    }

    await this.exec.init(initOptions)

    const self = this
    const conf = await this.getConfig()

    await this.replaceConfig(defaults({}, this.opts.config, conf))

    self.clean = false
    self.initialized = true

    return this
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @returns {Promise}
   */
  cleanup () {
    if (this.clean) {
      return
    }

    return repoUtils.removeRepo(this.path)
  }

  /**
   * Start the daemon.
   *
   * @returns {Promise}
   */
  async start () {
    await this.exec.start()

    this._started = true
    this.api = this.exec

    const conf = await this.exec.config.get()

    this._apiAddr = conf.Addresses.API
    this._gatewayAddr = conf.Addresses.Gateway

    this.api.apiHost = multiaddr(conf.Addresses.API).nodeAddress().host
    this.api.apiPort = multiaddr(conf.Addresses.API).nodeAddress().port

    return this.api
  }

  /**
   * Stop the daemon.
   *
   * @returns {Promise}
   */
  async stop () {
    if (!this.exec) {
      return
    }

    await this.exec.stop()

    this._started = false

    if (this.disposable) {
      return this.cleanup()
    }
  }

  /**
   * Kill the `ipfs daemon` process.
   *
   * First `SIGTERM` is sent, after 10.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   *
   * @returns {Promise}
   */
  killProcess () {
    return this.stop()
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
   * @returns {Promise}
   */
  getConfig (key) {
    return this.exec.config.get(key)
  }

  /**
   * Set a config value.
   *
   * @param {string} key
   * @param {string} value
   * @returns {Promise}
   */
  setConfig (key, value) {
    return this.exec.config.set(key, value)
  }

  /**
   * Replace the current config with the provided one
   *
   * @param {Object} config
   * @return {Promise}
   */
  replaceConfig (config) {
    return this.exec.config.replace(config)
  }

  /**
   * Get the version of ipfs
   *
   * @returns {Promise}
   */
  version () {
    return this.exec.version()
  }
}

module.exports = InProc
