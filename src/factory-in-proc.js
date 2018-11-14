'use strict'

const series = require('async/series')
const merge = require('merge-options')
const tmpDir = require('./utils/tmp-dir')
const InProc = require('./ipfsd-in-proc')
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
   * @param {string} type - the type of the node
   * @param {function(Error, string): void} callback
   */
  tmpDir (type, callback) {
    callback(null, tmpDir(true))
  }

  /**
   * Get the version of the currently used go-ipfs binary.
   *
   * @param {Object} [options={}]
   * @param {function(Error, string): void} callback
   */
  version (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    const node = new InProc(options)
    node.version(callback)
  }

  /**
   * Spawn JSIPFS instances
   *
   * @param {SpawnOptions} [options={}] - various config options and ipfs config parameters
   * @param {function(Error, InProc): void} callback - a callback that receives an array with an `ipfs-instance` attached to the node and a `Node`
   * @returns {void}
   */
  spawn (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    const daemonOptions = merge({
      exec: this.options.exec,
      type: this.options.type,
      IpfsApi: this.options.IpfsApi,
      disposable: true,
      start: options.disposable !== false,
      init: options.disposable !== false,
      config: defaultConfig
    }, options)

    if (options.defaultAddrs) {
      delete daemonOptions.config.Addresses
    }

    if (typeof this.options.exec !== 'function') {
      return callback(new Error(`'type' proc requires 'exec' to be a coderef`))
    }

    const node = new InProc(daemonOptions)

    series([
      daemonOptions.init && (cb => node.init(daemonOptions.initOptions, cb)),
      daemonOptions.start && (cb => node.start(daemonOptions.args, cb))
    ].filter(Boolean),
    (err) => {
      if (err) { return callback(err) }

      callback(null, node)
    })
  }
}

module.exports = FactoryInProc
