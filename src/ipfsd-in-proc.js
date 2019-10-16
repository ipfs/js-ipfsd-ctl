'use strict'

const multiaddr = require('multiaddr')
const merge = require('merge-options')
const { repoExists, removeRepo, checkForRunningApi } = require('./utils/repo')

/** @ignore @typedef {import("./index").IpfsOptions} IpfsOptions */
/** @ignore @typedef {import("./index").FactoryOptions} FactoryOptions */

/**
 * ipfsd for a js-ipfs instance (aka in-process IPFS node)
 */
class InProc {
  /**
   * @constructor
   * @param {FactoryOptions} [opts]
   */
  constructor (opts = {}) {
    this.opts = opts
    this.path = this.opts.ipfsOptions.repo
    this.disposable = opts.disposable
    this.initialized = false
    this.started = false
    this.clean = true
    this.apiAddr = null
    this.gatewayAddr = null
    this.api = null

    this.opts.ipfsOptions.EXPERIMENTAL = merge({ sharding: false }, opts.ipfsOptions.EXPERIMENTAL)

    this.opts.args.forEach((arg, index) => {
      if (arg === '--enable-sharding-experiment') {
        this.opts.ipfsOptions.EXPERIMENTAL.sharding = true
      } else if (arg === '--enable-namesys-pubsub') {
        this.opts.ipfsOptions.EXPERIMENTAL.ipnsPubsub = true
      } else if (arg === '--enable-dht-experiment') {
        this.opts.ipfsOptions.EXPERIMENTAL.dht = true
      } else if (arg === '--offline') {
        this.opts.ipfsOptions.offline = true
      } else if (arg.startsWith('--pass')) {
        this.opts.ipfsOptions.pass = this.opts.args[index + 1]
      }
    })
  }

  async setExec () {
    if (this.api !== null) {
      return this
    }

    const IPFS = this.opts.ipfsApi.ref
    this.api = await IPFS.create(this.opts.ipfsOptions)
    return this
  }

  setApi (addr) {
    this.apiAddr = multiaddr(addr)
    this.api = (this.opts.ipfsHttp.ref)(addr)
    this.api.apiHost = this.apiAddr.nodeAddress().address
    this.api.apiPort = this.apiAddr.nodeAddress().port
  }

  setGateway (addr) {
    this.gatewayAddr = multiaddr(addr)
    this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
    this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOptions={}] - @see https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsinit
   * @returns {Promise}
   */
  async init (initOptions) {
    const initialized = await repoExists(this.path)
    if (initialized && typeof initOptions === 'object') {
      throw new Error(`Repo already initialized can't use different options, ${JSON.stringify(initOptions)}`)
    }

    if (initialized) {
      this.initialized = true
      this.clean = false
      return this
    }

    // Repo not initialized
    const opts = merge(
      {
        emptyRepo: false,
        bits: 2048
      },
      initOptions === true ? {} : initOptions
    )

    await this.setExec()
    if (!this.opts.ipfsOptions.init) {
      await this.api.init(opts)
    }

    const conf = await this.getConfig()
    await this.replaceConfig(merge(conf, this.opts.ipfsOptions.config))
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
    if (!this.opts.ipfsOptions.start) {
      await this.api.start()
    }
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
