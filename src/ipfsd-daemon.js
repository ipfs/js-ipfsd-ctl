/* eslint-disable no-async-promise-executor */
'use strict'

const multiaddr = require('multiaddr')
const fs = require('fs-extra')
const merge = require('merge-options')
const debug = require('debug')
const execa = require('execa')
const hat = require('hat')
const path = require('path')
const os = require('os')
const log = debug('ipfsd-ctl:daemon')
const safeStringify = require('safe-json-stringify')
const { checkForRunningApi } = require('./utils/repo')

const daemonLog = {
  info: debug('ipfsd-ctl:daemon:stdout'),
  err: debug('ipfsd-ctl:daemon:stderr')
}
// amount of ms to wait before sigkill
const GRACE_PERIOD = 10500

// amount of ms to wait before sigkill for non disposable repos
const NON_DISPOSABLE_GRACE_PERIOD = 10500 * 3

function translateError (err) {
  // get the actual error message to be the err.message
  const message = err.message
  err.message = err.stderr
  err.stderr = message

  throw err
}

/** @ignore @typedef {import("./index").FactoryOptions} FactoryOptions */

/**
 * ipfsd for a go-ipfs or js-ipfs daemon
 * Create a new node.
 *
 */
class Daemon {
  /**
   * @constructor
   * @param {FactoryOptions} [opts]
   */
  constructor (opts) {
    this.opts = opts
    this.path = this.opts.ipfsOptions.repo
    this.exec = this.opts.ipfsBin
    this.env = Object.assign({}, this.env, { IPFS_PATH: this.path })
    this.disposable = opts.disposable
    this.subprocess = null
    this.initialized = fs.existsSync(this.path)
    this.started = false
    this.clean = true
    this.apiAddr = null
    this.gatewayAddr = null
    this.api = null
  }

  setApi (addr) {
    this.apiAddr = multiaddr(addr)
    this.api = require(this.opts.ipfsHttp.path)(addr)
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
    if (this.initialized && typeof initOptions === 'object') {
      throw new Error(`Repo already initialized can't use different options, ${JSON.stringify(initOptions)}`)
    }
    if (this.initialized) {
      this.clean = false
      return this
    }

    const opts = merge(
      {
        emptyRepo: false,
        bits: 2048
      },
      initOptions === true ? {} : initOptions
    )

    const args = ['init']
    // bits
    if (opts.bits) {
      args.push('-b')
      args.push(opts.bits)
    }

    // pass
    if (opts.pass) {
      args.push('--pass')
      args.push('"' + opts.pass + '"')
    }

    // profiles
    // if (opts.profiles && Array.isArray(opts.profiles)) {
    //   args.push('-p')
    //   args.push(opts.profiles.join(','))
    // }

    await execa(this.exec, args, {
      env: this.env
    })
      .catch(translateError)

    const conf = await this.getConfig()

    await this.replaceConfig(merge(conf, this.opts.ipfsOptions.config))

    this.clean = false
    this.initialized = true

    return this
  }

  /**
   * Delete the repo that was being used. If the node was marked as disposable this will be called automatically when the process is exited.
   *
   * @returns {Promise}
   */
  async cleanup () {
    if (this.clean) {
      return this
    }

    await fs.remove(this.path)
    this.clean = true
  }

  /**
   * Start the daemon.
   *
   * @return {Promise}
   */
  start () {
    let args = ['daemon']

    if (this.opts.args.length > 0) {
      args = args.concat(this.opts.args)
    }

    // Check if a daemon is already running
    const api = checkForRunningApi(this.path)

    if (api) {
      this.setApi(api)
      this.started = true
      return this.api
    }

    let output = ''
    return new Promise(async (resolve, reject) => {
      this.subprocess = execa(this.exec, args, {
        env: this.env
      })
      this.subprocess.stderr.on('data', data => daemonLog.err(data.toString()))
      this.subprocess.stdout.on('data', data => {
        daemonLog.info(data.toString())
        output += data
        const apiMatch = output.trim().match(/API .*listening on:? (.*)/)
        const gwMatch = output.trim().match(/Gateway .*listening on:? (.*)/)

        if (apiMatch && apiMatch.length > 0) {
          this.setApi(apiMatch[1])
        }

        if (gwMatch && gwMatch.length > 0) {
          this.setGateway(gwMatch[1])
        }

        if (output.match(/(?:daemon is running|Daemon is ready)/)) {
          // we're good
          this.started = true
          resolve(this.api)
        }
      })

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
   * @param {number} [timeout] - Use timeout to specify the grace period in ms before hard stopping the daemon. Otherwise, a grace period of 10500 ms will be used for disposable nodes and 10500 * 3 ms for non disposable nodes.
   * @return {Promise}
   */
  async stop (timeout) {
    if (!this.started) {
      return this
    }
    if (!this.subprocess) {
      return this
    }
    await this.api.stop()
    await this.killProcess(timeout)

    if (this.disposable) {
      return this.cleanup()
    }
  }

  /**
   * Kill the `ipfs daemon` process.
   *
   * If the HTTP API is established, then send 'shutdown' command; otherwise,
   * process.kill(`SIGTERM`) is used.  In either case, if the process
   * does not exit after 10.5 seconds then a `SIGKILL` is used.
   *
   * Note: timeout is ignored for proc nodes
   *
   * @param {Number} [timeout] - Use timeout to specify the grace period in ms before hard stopping the daemon. Otherwise, a grace period of 10500 ms will be used for disposable nodes and 10500 * 3 ms for non disposable nodes.
   * @returns {Promise}
   */
  killProcess (timeout) {
    if (!timeout) {
      timeout = this.disposable
        ? GRACE_PERIOD
        : NON_DISPOSABLE_GRACE_PERIOD
    }

    return new Promise((resolve, reject) => {
      // need a local var for the closure, as we clear the var.
      const subprocess = this.subprocess
      this.subprocess = null

      const grace = setTimeout(() => {
        log('kill timeout, using SIGKILL', subprocess.pid)
        subprocess.kill('SIGKILL')
      }, timeout)

      subprocess.once('exit', () => {
        log('killed', subprocess.pid)
        clearTimeout(grace)
        this.started = false

        if (this.disposable) {
          return this.cleanup().then(resolve, reject)
        }

        resolve()
      })

      if (this.api) {
        log('kill via api', subprocess.pid)
        this.api.shutdown(() => null)
      } else {
        log('killing', subprocess.pid)
        subprocess.kill('SIGTERM')
      }
    })
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {number}
   */
  pid () {
    return this.subprocess && this.subprocess.pid
  }

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   *
   * @param {string} [key] - A specific config to retrieve.
   * @returns {Promise}
   */
  async getConfig (key = 'show') {
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
   * Set a config value.
   *
   * @param {string} key - The key of the config entry to change/set.
   * @param {string} value - The config value to change/set.
   * @returns {Promise}
   */
  setConfig (key, value) {
    return execa(
      this.exec,
      ['config', key, value, '--json'],
      { env: this.env }
    )
      .catch(translateError)
  }

  /**
   * Replace the current config with the provided one
   *
   * @param {object} config
   * @returns {Promise}
   */
  async replaceConfig (config) {
    const tmpFile = path.join(os.tmpdir(), hat())

    await fs.writeFile(tmpFile, safeStringify(config))
    await execa(
      this.exec,
      ['config', 'replace', `${tmpFile}`],
      { env: this.env }
    )
      .catch(translateError)
    await fs.unlink(tmpFile)
  }

  /**
   * Get the version of ipfs
   *
   * @returns {Promise}
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
