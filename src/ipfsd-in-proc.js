'use strict'

const multiaddr = require('multiaddr')
const IpfsClient = require('ipfs-http-client')
const merge = require('merge-options')
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
    this.apiAddr = null
    this.gatewayAddr = null
    this.api = null

    this.opts.EXPERIMENTAL = merge({ sharding: false }, opts.EXPERIMENTAL)

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
  }

  async setExec () {
    if (this.api !== null) {
      return this
    }

    const IPFS = this.opts.exec

    this.api = await IPFS.create({
      repo: this.path,
      init: false,
      start: false,
      pass: this.opts.pass,
      EXPERIMENTAL: this.opts.EXPERIMENTAL,
      libp2p: this.opts.libp2p,
      config: this.opts.config,
      silent: this.opts.silent,
      relay: this.opts.relay,
      preload: this.opts.preload,
      ipld: this.opts.ipld,
      connectionManager: this.opts.connectionManager
    })
    return this
  }

  setApi (addr) {
    this.apiAddr = multiaddr(addr)
    this.api = (this.opts.IpfsApi || IpfsClient)(addr)
    this.api.apiHost = this.apiAddr.nodeAddress().address
    this.api.apiPort = this.apiAddr.nodeAddress().port
  }

  setGateway (addr) {
    this.gatewayAddr = multiaddr(addr)
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
   * @returns {Promise}
   */
  async init (initOptions) {
    const initialized = await repoExists(this.path)
    if (initialized && initOptions) {
      throw new Error(`Repo already initialized can't use different options, ${JSON.stringify(initOptions)}`)
    }

    if (initialized) {
      this.initialized = true
      this.clean = false
      return this
    }

    // Repo not initialized
    initOptions = initOptions || {}

    await this.setExec()
    await this.api.init(initOptions)

    const conf = await this.getConfig()
    await this.replaceConfig(merge(conf, this.opts.config))
    this.clean = false
    this.initialized = true
    return this
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @returns {Promise}
   */
  async cleanup () {
    if (this.clean) {
      return this
    }
    await removeRepo(this.path)
    this.clean = true
  }

  /**
   * Start the daemon.
   *
   * @returns {Promise}
   */
  async start () {
    // Check if a daemon is already running
    const api = checkForRunningApi(this.path)
    if (api) {
      this.setApi(api)
      this.started = true
      return this.api
    }

    await this.setExec()
    await this.api.start()
    this.started = true

    return this.api
  }

  /**
   * Stop the daemon.
   *
   * @returns {Promise}
   */
  async stop () {
    if (!this.api || !this.started) {
      return this
    }

    await this.api.stop()

    this.started = false

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
    return this.api.config.get(key)
  }

  /**
   * Set a config value.
   *
   * @param {string} key
   * @param {string} value
   * @returns {Promise}
   */
  setConfig (key, value) {
    return this.api.config.set(key, value)
  }

  /**
   * Replace the current config with the provided one
   *
   * @param {Object} config
   * @return {Promise}
   */
  replaceConfig (config) {
    return this.api.config.replace(config)
  }

  /**
   * Get the version of ipfs
   *
   * @returns {Promise}
   */
  async version () {
    await this.setExec()
    return this.api.version()
  }
}

module.exports = InProc
