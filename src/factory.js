'use strict'
const merge = require('merge-options')
const kyOriginal = require('ky-universal').default
const { defaultRepo, tmpDir, findBin } = require('./utils')
const { isNode } = require('ipfs-utils/src/env')
const IPFSdDaemon = require('./ipfsd-daemon')
const IPFSdClient = require('./ipfsd-client')
const IPFSdProc = require('./ipfsd-in-proc')

const ky = kyOriginal.extend({ timeout: false })

/** @typedef {import("./index").FactoryOptions} FactoryOptions */
/** @typedef {import("./index").IpfsOptions} IpfsOptions */

/**
 * Factory class to spawn ipfsd daemons
 */
class Factory {
  /**
     *
     * @param {FactoryOptions} options
     */
  constructor (options = {}) {
    /** @type FactoryOptions */
    this.opts = merge({
      remote: !isNode,
      host: 'localhost',
      port: 43134,
      secure: false,
      disposable: true,
      type: 'go',
      env: {},
      args: [],
      ipfsHttp: {
        path: require.resolve('ipfs-http-client'),
        ref: require('ipfs-http-client')
      },
      ipfsApi: {
        path: require.resolve('ipfs'),
        ref: require('ipfs')
      },
      ipfsBin: findBin(options.type || 'go'),
      ipfsOptions: {}
    }, options)

    this.baseUrl = `${this.opts.secure ? 'https://' : 'http://'}${this.opts.host}:${this.opts.port}`
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   *
   * @returns {Promise<String>}
   */
  async tmpDir () {
    if (this.opts.remote) {
      const res = await ky.get(
        `${this.baseUrl}/util/tmp-dir`,
        { searchParams: { type: this.opts.type } }
      ).json()

      return res.tmpDir
    }

    return Promise.resolve(tmpDir(this.opts.type))
  }

  /**
   * Get the version of the IPFS Daemon.
   *
   * @returns {Promise<String>}
   */
  async version () {
    const f = new Factory(this.opts)
    const node = await f.spawn()
    const version = await node.version()

    await node.stop()

    return version
  }

  /**
   * Spawn a IPFS node
   * @param {IpfsOptions} options
   * @returns {Promise<IPFSdDaemon | IPFSdClient | IPFSdProc>}
   */
  async spawn (options = {}) {
    if (this.opts.type !== 'proc' && this.opts.remote) { // spawn remote node
      const res = await ky.post(
        `${this.baseUrl}/spawn`,
        {
          json: merge(
            this.opts,
            {
              remote: false, // avoid recursive spawning
              ipfsOptions: options // let the remote do defaults
            }
          )
        }
      ).json()
      return new IPFSdClient(
        this.baseUrl,
        res,
        this.opts
      )
    }

    const ipfsOptions = merge(
      {
        start: this.opts.disposable !== false,
        init: this.opts.disposable !== false,
        repo: this.opts.disposable
          ? tmpDir(this.opts.type)
          : defaultRepo(this.opts.type)
      },
      this.opts.ipfsOptions,
      options
    )

    let node
    // spawn in-proc node
    if (this.opts.type === 'proc') {
      node = new IPFSdProc({ ...this.opts, ipfsOptions })
    } else {
      // spawn daemon node
      node = new IPFSdDaemon({ ...this.opts, ipfsOptions })
    }

    // Init node
    if (ipfsOptions.init) {
      await node.init(ipfsOptions.init)
    }

    // Start node
    if (ipfsOptions.start) {
      await node.start()
    }

    return node
  }
}

module.exports = Factory
