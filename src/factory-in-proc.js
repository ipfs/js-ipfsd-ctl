'use strict'

const defaults = require('lodash.defaultsdeep')
const clone = require('lodash.clone')
const path = require('path')
const tmpDir = require('./utils/tmp-dir')
const repoUtils = require('./utils/repo/nodejs')
const InProc = require('./ipfsd-in-proc')
const defaultConfig = require('./defaults/config.json')
const defaultOptions = require('./defaults/options.json')

/** @ignore @typedef {import("./index").SpawnOptions} SpawnOptions */

/**
 * Factory to spawn in-proc JS-IPFS instances (aka in process nodes)
 * @class
 * @param {Object} options
 * @param {String} [options.type='proc'] - one of 'go', 'js' or 'proc', in this case this needs to be 'proc'
 * @param {String} [options.exec] - the path of the daemon executable or IPFS class in the case of `proc`
 */
class FactoryInProc {
  constructor (options) {
    options = options || {}
    if (options.type !== 'proc') {
      throw new Error('This Factory only knows how to create in proc nodes')
    }
    this.options = options
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   *
   * *Here for completeness*
   *
   * @returns {Promise}
   */
  tmpDir () {
    return tmpDir(true)
  }

  /**
   * Get the version of the currently used go-ipfs binary.
   *
   * @param {Object} [options={}]
   * @returns {Promise}
   */
  version (options = {}) {
    return new Promise((resolve, reject) => {
      const node = new InProc(options)
      node.once('ready', () => {
        node.version()
          .then(resolve, reject)
      })
      node.once('error', reject)
    })
  }

  /**
   * Spawn JSIPFS instances
   *
   * @param {SpawnOptions} [opts={}] - various config options and ipfs config parameters
   * @returns {Promise} - Resolves to an array with an `ipfs-instance` attached to the node and a `Node`
   */
  async spawn (opts = {}) {
    const options = defaults({}, opts, defaultOptions)
    options.init = typeof options.init !== 'undefined'
      ? options.init
      : true

    if (options.disposable) {
      options.config = defaults({}, options.config, defaultConfig)
    } else {
      const nonDisposableConfig = clone(defaultConfig)
      options.init = false
      options.start = false

      const defaultRepo = path.join(
        process.env.HOME || process.env.USERPROFILE || '',
        options.isJs ? '.jsipfs' : '.ipfs'
      )

      options.repoPath = options.repoPath || (process.env.IPFS_PATH || defaultRepo)
      options.config = defaults({}, options.config, nonDisposableConfig)
    }

    if (options.defaultAddrs) {
      delete options.config.Addresses
    }

    options.type = this.options.type
    options.exec = options.exec || this.options.exec
    options.silent = options.silent || true

    if (typeof options.exec !== 'function') {
      throw new Error(`'type' proc requires 'exec' to be a coderef`)
    }

    const node = new InProc(options)

    await new Promise((resolve, reject) => {
      node.once('error', reject)
      node.once('ready', () => {
        resolve()
      })
    })

    node.initialized = await repoUtils.repoExists(node.path)

    if (options.init) {
      await node.init()
    }

    if (options.start) {
      await node.start(options.args)
    }

    return node
  }
}

module.exports = FactoryInProc
