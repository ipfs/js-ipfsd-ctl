'use strict'
const merge = require('merge-options').bind({ ignoreUndefined: true })
const { tmpDir } = require('./utils')
const { isNode } = require('ipfs-utils/src/env')
const http = require('ipfs-utils/src/http')
const ControllerDaemon = require('./ipfsd-daemon')
const ControllerRemote = require('./ipfsd-client')
const ControllerProc = require('./ipfsd-in-proc')
const testsConfig = require('./config')

/**
 * @typedef {import("./types").ControllerOptions} ControllerOptions
 * @typedef {import("./types").ControllerOptionsOverrides} ControllerOptionsOverrides
 * @typedef {import("./types").IPFSOptions} IPFSOptions
 * @typedef {import('./types').Controller} Controller
 */

const defaults = {
  remote: !isNode,
  endpoint: process.env.IPFSD_CTL_SERVER || 'http://localhost:43134',
  disposable: true,
  test: false,
  type: 'go',
  env: {},
  args: [],
  ipfsOptions: {},
  forceKill: true,
  forceKillTimeout: 5000
}

/**
 * Factory class to spawn ipfsd controllers
 */
class Factory {
  /**
   *
   * @param {ControllerOptions} options
   * @param {ControllerOptionsOverrides} overrides - Pre-defined overrides per controller type
   */
  constructor (options = {}, overrides = {}) {
    /** @type ControllerOptions */
    this.opts = merge(defaults, options)

    /** @type ControllerOptionsOverrides */
    this.overrides = merge({
      js: merge(this.opts, { type: 'js' }),
      go: merge(this.opts, { type: 'go' }),
      proc: merge(this.opts, { type: 'proc' })
    }, overrides)

    /** @type {Controller[]} */
    this.controllers = []
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   *
   * @param {ControllerOptions} [options]
   * @returns {Promise<string>}
   */
  async tmpDir (options = {}) {
    const opts = merge(this.opts, options)

    if (opts.remote) {
      const res = await http.get(
        `${opts.endpoint}/util/tmp-dir`,
        { searchParams: new URLSearchParams({ type: `${opts.type}` }) }
      )
      const out = await res.json()

      return out.tmpDir
    }

    return Promise.resolve(tmpDir(opts.type))
  }

  /**
   * @param {IPFSOptions & { endpoint: string }} options
   */
  async _spawnRemote (options) {
    const opts = {
      json: {
        ...options,
        // avoid recursive spawning
        remote: false,
        ipfsBin: undefined,
        ipfsModule: undefined,
        ipfsHttpModule: undefined
      }
    }

    const res = await http.post(
      `${options.endpoint}/spawn`,
      opts
    )
    return new ControllerRemote(
      options.endpoint,
      await res.json(),
      options
    )
  }

  /**
   * Spawn an IPFSd Controller
   *
   * @param {ControllerOptions} options
   * @returns {Promise<Controller>}
   */
  async spawn (options = { }) {
    const type = options.type || this.opts.type || 'go'
    const opts = merge(
      this.overrides[type],
      options
    )

    // IPFS options defaults
    const ipfsOptions = merge(
      {
        start: false,
        init: false
      },
      opts.test
        ? {
            config: testsConfig(opts),
            preload: { enabled: false }
          }
        : {},
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
   */
  async clean () {
    await Promise.all(this.controllers.map(n => n.stop()))
    this.controllers = []
  }
}

module.exports = Factory
