'use strict'

const { Multiaddr } = require('multiaddr')
const merge = require('merge-options').bind({ ignoreUndefined: true })
const { repoExists, removeRepo, checkForRunningApi, tmpDir, defaultRepo } = require('./utils')
const debug = require('debug')

const daemonLog = {
  info: debug('ipfsd-ctl:proc:stdout'),
  err: debug('ipfsd-ctl:proc:stderr')
}
/** @typedef {import("./index").ControllerOptions} ControllerOptions */

/**
 * Controller for in process nodes
 */
class InProc {
  /**
   * @param {ControllerOptions} opts
   */
  constructor (opts) {
    /** @type ControllerOptions */
    this.opts = opts
    this.path = this.opts.ipfsOptions.repo || (opts.disposable ? tmpDir(opts.type) : defaultRepo(opts.type))
    this.initOptions = toInitOptions(opts.ipfsOptions.init)
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
      return
    }

    const IPFS = this.opts.ipfsModule

    this.api = await IPFS.create({
      ...this.opts.ipfsOptions,
      silent: true,
      repo: this.path,
      init: this.initOptions
    })
  }

  /**
   * @private
   * @param {string} addr
   */
  _setApi (addr) {
    this.apiAddr = new Multiaddr(addr)
    this.api = this.opts.ipfsHttpModule.create(addr)
    this.api.apiHost = this.apiAddr.nodeAddress().address
    this.api.apiPort = this.apiAddr.nodeAddress().port
  }

  /**
   * @private
   * @param {string} addr
   */
  _setGateway (addr) {
    this.gatewayAddr = new Multiaddr(addr)
    this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
    this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOptions={}] - @see https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsinit
   * @returns {Promise<InProc>}
   */
  async init (initOptions) {
    this.initialized = await repoExists(this.path)
    if (this.initialized) {
      this.clean = false
      return this
    }

    // Repo not initialized
    this.initOptions = merge(
      {
        emptyRepo: false,
        profiles: this.opts.test ? ['test'] : []
      },
      this.initOptions,
      toInitOptions(initOptions)
    )

    await this.setExec()
    this.clean = false
    this.initialized = true
    return this
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @returns {Promise<InProc>}
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
   * @returns {Promise<InProc>}
   */
  async start () {
    // Check if a daemon is already running
    const api = checkForRunningApi(this.path)
    if (api) {
      this._setApi(api)
    } else {
      await this.setExec()
      await this.api.start()
    }

    this.started = true
    // Add `peerId`
    const id = await this.api.id()
    this.api.peerId = id
    daemonLog.info(id)
    return this
  }

  /**
   * Stop the daemon.
   *
   * @returns {Promise<InProc>}
   */
  async stop () {
    if (!this.started) {
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
   * Get the version of ipfs
   *
   * @returns {Promise<Object>}
   */
  async version () {
    await this.setExec()
    return this.api.version()
  }
}

const toInitOptions = (init) =>
  typeof init === 'boolean' ? {} : init

module.exports = InProc
