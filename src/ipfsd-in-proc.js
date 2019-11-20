'use strict'

const multiaddr = require('multiaddr')
const merge = require('merge-options')
const { repoExists, removeRepo, checkForRunningApi } = require('./utils')
const debug = require('debug')

const daemonLog = {
  info: debug('ipfsd-ctl:proc:stdout'),
  err: debug('ipfsd-ctl:proc:stderr')
}
/** @ignore @typedef {import("./index").IpfsOptions} IpfsOptions */
/** @ignore @typedef {import("./index").FactoryOptions} FactoryOptions */

/**
 * Factory to spawn in-proc JS-IPFS instances (aka in process nodes)
 */
class InProc {
  /**
   * @param {FactoryOptions} opts
   */
  constructor (opts) {
    /** @type FactoryOptions */
    this.opts = opts
    this.path = this.opts.ipfsOptions.repo
    this.disposable = opts.disposable
    this.initialized = false
    this.started = false
    this.clean = true
    this.apiAddr = null
    this.gatewayAddr = null
    this.api = null
  }

  async setExec () {
    if (this.api !== null) {
      return this
    }

    const IPFS = this.opts.ipfsApi.ref
    this.api = await IPFS.create(merge({ silent: true }, this.opts.ipfsOptions))
    return this
  }

  /**
   * @private
   * @param {string} addr
   */
  _setApi (addr) {
    this.apiAddr = multiaddr(addr)
    this.api = (this.opts.ipfsHttp.ref)(addr)
    this.api.apiHost = this.apiAddr.nodeAddress().address
    this.api.apiPort = this.apiAddr.nodeAddress().port
  }

  /**
   * @private
   * @param {string} addr
   */
  _setGateway (addr) {
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
    this.initialized = await repoExists(this.path)
    if (this.initialized) {
      this.clean = false
      return this
    }

    // Repo not initialized
    const opts = merge(
      {
        emptyRepo: false,
        bits: 2048
      },
      typeof this.opts.ipfsOptions.init === 'boolean' ? {} : this.opts.ipfsOptions.init,
      typeof initOptions === 'boolean' ? {} : initOptions
    )

    await this.setExec()
    if (!this.opts.ipfsOptions.init) {
      await this.api.init(opts)
    }
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
    if (!this.clean) {
      await removeRepo(this.path)
      this.clean = true
    }
    return this
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
      this._setApi(api)
      this.started = true
      return this.api
    }

    await this.setExec()
    if (!this.opts.ipfsOptions.start) {
      await this.api.start()
    }
    this.started = true

    daemonLog.info(await this.api.id())
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
      await this.cleanup()
    }
    return this
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
