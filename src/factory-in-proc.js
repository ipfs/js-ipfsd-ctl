'use strict'

const tmpDir = require('./utils/tmp-dir')
const InProc = require('./ipfsd-in-proc')
const merge = require('merge-options')
const defaultConfig = require('./defaults/config.json')

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
    return Promise.resolve(tmpDir(true))
  }

  /**
   * Get the version of the currently used go-ipfs binary.
   *
   * @param {Object} [options={}]
   * @returns {Promise}
   */
  async version (options = {}) {
    const node = new InProc(options)
    const v = await node.version()
    return v
  }

  /**
   * Spawn JSIPFS instances
   *
   * @param {SpawnOptions} [options={}] - various config options and ipfs config parameters
   * @returns {Promise<InProc>} - Resolves to an array with an `ipfs-instance` attached to the node and a `Node`
   */
  async spawn (options = {}) {
    const daemonOptions = merge({
      exec: this.options.exec,
      type: this.options.type,
      IpfsApi: this.options.IpfsApi,
      disposable: true,
      start: options.disposable !== false,
      init: options.disposable !== false,
      config: defaultConfig,
      silent: true
    }, options)

    if (options.defaultAddrs) {
      delete daemonOptions.config.Addresses
    }

    if (typeof daemonOptions.exec !== 'function') {
      throw new Error('\'type\' proc requires \'exec\' to be a coderef')
    }

    const node = new InProc(daemonOptions)

    if (daemonOptions.init) {
      await node.init(daemonOptions.initOptions)
    }

    if (daemonOptions.start) {
      await node.start(daemonOptions.args)
    }

    return node
  }
}

module.exports = FactoryInProc
