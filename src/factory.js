'use strict'
const merge = require('merge-options').bind({ ignoreUndefined: true })
const kyOriginal = require('ky-universal').default
const { tmpDir, findBin } = require('./utils')
const { isNode } = require('ipfs-utils/src/env')
const ControllerDaemon = require('./ipfsd-daemon')
const ControllerRemote = require('./ipfsd-client')
const ControllerProc = require('./ipfsd-in-proc')
const testsConfig = require('./config')

/** @typedef {import("./index").ControllerOptions} ControllerOptions */
/** @typedef {import("./index").FactoryOptions} FactoryOptions */
/** @typedef {import("./index").IpfsOptions} IpfsOptions */

const ky = kyOriginal.extend({ timeout: false })
const defaults = {
  remote: !isNode,
  disposable: true,
  test: false,
  type: 'go',
  env: {},
  args: [],
  ipfsHttpModule: {
    path: require.resolve('ipfs-http-client'),
    ref: require('ipfs-http-client')
  },
  ipfsModule: {
    path: require.resolve('ipfs'),
    ref: require('ipfs')
  },
  ipfsBin: findBin('go'),
  ipfsOptions: {}
}

/**
 * Factory class to spawn ipfsd controllers
 */
class Factory {
  /**
   *
   * @param {FactoryOptions} options
   */
  constructor (options = {}) {
    /** @type FactoryOptions */
    this.opts = merge({
      test: false,
      endpoint: 'http://localhost:43134',
      js: merge(defaults, { test: options.test || false, type: 'js', ipfsBin: findBin('js') }),
      go: merge(defaults, { test: options.test || false }),
      proc: merge(defaults, { test: options.test || false, type: 'proc', ipfsBin: findBin('js') })
    }, options)

    /** @type ControllerDaemon[] */
    this.controllers = []
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   *
   * @param {ControllerOptions} options - Controller type
   *
   * @returns {Promise<String>}
   */
  async tmpDir (options) {
    options = merge(defaults, options)
    if (options.remote) {
      const res = await ky.get(
        `${this.opts.endpoint}/util/tmp-dir`,
        { searchParams: { type: options.type } }
      ).json()

      return res.tmpDir
    }

    return Promise.resolve(tmpDir(options.type))
  }

  async _spawnRemote (options) {
    const res = await ky.post(
      `${this.opts.endpoint}/spawn`,
      {
        json: { ...options, remote: false } // avoid recursive spawning
      }
    ).json()
    return new ControllerRemote(
      this.opts.endpoint,
      res,
      options
    )
  }

  /**
   * Spawn an IPFSd Controller
   * @param {ControllerOptions} options
   * @returns {Promise<ControllerDaemon>}
   */
  async spawn (options = { }) {
    const opts = merge(
      this.opts[options.type || 'go'],
      options
    )

    // IPFS options defaults
    const ipfsOptions = merge(
      {
        start: false,
        init: false
      },
      opts.test ? {
        config: testsConfig(opts),
        preload: { enabled: false }
      } : {},
      opts.ipfsOptions
    )

    let ctl
    if (opts.type === 'proc') {
      // spawn in-proc controller
      ctl = new ControllerProc({ ...opts, ipfsOptions })
    } else if (opts.remote) {
      // spawn remote controller
      ctl = await this._spawnRemote({ ...opts, ipfsOptions })
    } else {
      // spawn daemon controller
      ctl = new ControllerDaemon({ ...opts, ipfsOptions })
    }

    // Save the controller
    this.controllers.push(ctl)

    // Auto init and start controller
    if (opts.disposable && (!options.ipfsOptions || (options.ipfsOptions && options.ipfsOptions.init !== false))) {
      await ctl.init(ipfsOptions.init)
    }
    if (opts.disposable && (!options.ipfsOptions || (options.ipfsOptions && options.ipfsOptions.start !== false))) {
      await ctl.start()
    }

    return ctl
  }

  /**
   * Stop all controllers
   * @returns {Promise<ControllerDaemon[]>}
   */
  clean () {
    return Promise.all(this.controllers.map(n => n.stop()))
  }
}

module.exports = Factory
