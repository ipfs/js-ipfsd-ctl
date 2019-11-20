/* eslint-disable no-async-promise-executor */
'use strict'

const multiaddr = require('multiaddr')
const fs = require('fs-extra')
const merge = require('merge-options')
const debug = require('debug')
const execa = require('execa')
const nanoid = require('nanoid')
const path = require('path')
const os = require('os')
const tempWrite = require('temp-write')
const { checkForRunningApi, repoExists } = require('./utils')

const daemonLog = {
  info: debug('ipfsd-ctl:daemon:stdout'),
  err: debug('ipfsd-ctl:daemon:stderr')
}

function translateError (err) {
  // get the actual error message to be the err.message
  err.message = `${err.stdout} \n\n ${err.stderr} \n\n ${err.message} \n\n`

  throw err
}

/** @typedef {import("./index").FactoryOptions} FactoryOptions */
/** @typedef {import("ipfs")} IPFS */

/**
 * ipfsd for a go-ipfs or js-ipfs daemon
 * Create a new node.
 * @class
 *
 */
class Daemon {
  /**
   * @constructor
   * @param {FactoryOptions} [opts]
   */
  constructor (opts) {
    this.opts = opts
    // make sure we have real paths
    this.opts.ipfsHttp.path = fs.realpathSync(this.opts.ipfsHttp.path)
    this.opts.ipfsApi.path = fs.realpathSync(this.opts.ipfsApi.path)
    this.opts.ipfsBin = fs.realpathSync(this.opts.ipfsBin)

    this.path = this.opts.ipfsOptions.repo
    this.exec = this.opts.ipfsBin
    this.env = merge({ IPFS_PATH: this.path }, this.opts.env)
    this.disposable = this.opts.disposable
    this.subprocess = null
    this.initialized = false
    this.started = false
    this.clean = true
    this.apiAddr = null
    this.gatewayAddr = null
    this.api = null
  }

  /**
   * @private
   * @param {string} addr
   */
  _setApi (addr) {
    this.apiAddr = multiaddr(addr)
    this.api = require(this.opts.ipfsHttp.path)(addr)
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
   * @returns {Promise<Daemon>}
   */
  async init (initOptions) {
    this.initialized = await repoExists(this.path)
    if (this.initialized) {
      this.clean = false
      return this
    }

    const opts = merge(
      {
        emptyRepo: false,
        bits: 2048
      },
      typeof this.opts.ipfsOptions.init === 'boolean' ? {} : this.opts.ipfsOptions.init,
      typeof initOptions === 'boolean' ? {} : initOptions
    )

    const args = ['init']

    // default-config only for JS
    if (this.opts.ipfsOptions.config && this.opts.type === 'js') {
      args.push(tempWrite.sync(JSON.stringify(this.opts.ipfsOptions.config)))
    }

    // Translate ipfs options to cli args
    if (opts.bits) {
      args.push('--bits', opts.bits)
    }
    if (opts.pass && this.opts.type === 'js') {
      args.push('--pass', '"' + opts.pass + '"')
    }
    if (opts.emptyRepo) {
      args.push('--empty-repo')
    }
    if (opts.profiles && Array.isArray(opts.profiles)) {
      args.push('--profile', opts.profiles.join(','))
    }

    const { stdout, stderr } = await execa(this.exec, args, {
      env: this.env
    })
      .catch(translateError)

    daemonLog.info(stdout)
    daemonLog.err(stderr)

    // default-config only for Go
    if (this.opts.type === 'go') {
      const conf = await this._getConfig()
      await this._replaceConfig(merge(conf, this.opts.ipfsOptions.config))
    }

    this.clean = false
    this.initialized = true

    return this
  }

  /**
   * Delete the repo that was being used. If the node was marked as disposable this will be called automatically when the process is exited.
   *
   * @returns {Promise<Daemon>}
   */
  async cleanup () {
    if (!this.clean) {
      await fs.remove(this.path)
      this.clean = true
    }
    return this
  }

  /**
   * Start the daemon.
   *
   * @return {Promise<IPFS>}
   */
  start () {
    const args = ['daemon']
    const opts = this.opts.ipfsOptions
    // add custom args
    args.push(...this.opts.args)

    if (opts.pass && this.opts.type === 'js') {
      args.push('--pass', '"' + opts.pass + '"')
    }
    if (opts.offline) {
      args.push('--offline')
    }
    if (opts.preload && this.opts.type === 'js') {
      args.push('--enable-preload', Boolean(opts.preload.enable))
    }
    if (opts.EXPERIMENTAL && opts.EXPERIMENTAL.sharding) {
      args.push('--enable-sharding-experiment')
    }
    if (opts.EXPERIMENTAL && opts.EXPERIMENTAL.ipnsPubsub) {
      args.push('--enable-namesys-pubsub')
    }

    // Check if a daemon is already running
    const api = checkForRunningApi(this.path)
    if (api) {
      this._setApi(api)
      this.started = true
      return this.api
    }

    let output = ''
    return new Promise(async (resolve, reject) => {
      this.subprocess = execa(this.exec, args, {
        env: this.env
      })
      this.subprocess.stderr.on('data', data => daemonLog.err(data.toString()))
      this.subprocess.stdout.on('data', data => daemonLog.info(data.toString()))

      const readyHandler = data => {
        output += data
        const apiMatch = output.trim().match(/API .*listening on:? (.*)/)
        const gwMatch = output.trim().match(/Gateway .*listening on:? (.*)/)

        if (apiMatch && apiMatch.length > 0) {
          this._setApi(apiMatch[1])
        }

        if (gwMatch && gwMatch.length > 0) {
          this._setGateway(gwMatch[1])
        }

        if (output.match(/(?:daemon is running|Daemon is ready)/)) {
          // we're good
          this.started = true
          this.subprocess.stdout.off('data', readyHandler)
          resolve(this.api)
        }
      }
      this.subprocess.stdout.on('data', readyHandler)

      try {
        await this.subprocess
          .catch(translateError)
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Stop the daemon.
   *
   * @return {Promise<Daemon>}
   */
  async stop () {
    if (!this.started) {
      return this
    }
    if (!this.subprocess) {
      return this
    }

    await this.api.stop()
    this.subprocess.stderr.removeAllListeners()
    this.subprocess.stdout.removeAllListeners()
    this.started = false

    if (this.disposable) {
      await this.cleanup()
    }

    return this
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {Promise<Number>}
   */
  pid () {
    if (this.subprocess) {
      return Promise.resolve(this.subprocess.pid)
    }
    throw new Error('Daemon process is not running.')
  }

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   *
   * @private
   * @param {string} [key] - A specific config to retrieve.
   * @returns {Promise<Object|String>}
   */
  async _getConfig (key = 'show') {
    const {
      stdout
    } = await execa(
      this.exec,
      ['config', key],
      {
        env: this.env
      })
      .catch(translateError)

    if (key === 'show') {
      return JSON.parse(stdout)
    }

    return stdout.trim()
  }

  /**
   * Replace the current config with the provided one
   *
   * @private
   * @param {object} config
   * @returns {Promise<Daemon>}
   */
  async _replaceConfig (config) {
    const tmpFile = path.join(os.tmpdir(), nanoid())

    await fs.writeFile(tmpFile, JSON.stringify(config))
    await execa(
      this.exec,
      ['config', 'replace', `${tmpFile}`],
      { env: this.env }
    )
      .catch(translateError)
    await fs.unlink(tmpFile)

    return this
  }

  /**
   * Get the version of ipfs
   *
   * @returns {Promise<String>}
   */
  async version () {
    const {
      stdout
    } = await execa(this.exec, ['version'], {
      env: this.env
    })
      .catch(translateError)

    return stdout.trim()
  }
}

module.exports = Daemon
