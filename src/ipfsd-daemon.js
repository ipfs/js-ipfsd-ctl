'use strict'

const IpfsClient = require('ipfs-http-client')
const multiaddr = require('multiaddr')
const fs = require('fs-extra')
const path = require('path')
const merge = require('merge-options')
const debug = require('debug')
const os = require('os')
const hat = require('hat')
const log = debug('ipfsd-ctl:daemon')
const safeStringify = require('safe-json-stringify')
const tmpDir = require('./utils/tmp-dir')
const findIpfsExecutable = require('./utils/find-ipfs-executable')
const setConfigValue = require('./utils/set-config-value')
const run = require('./utils/run')
const { checkForRunningApi, defaultRepo } = require('./utils/repo/nodejs')

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

/**
 * ipfsd for a go-ipfs or js-ipfs daemon
 * Create a new node.
 *
 * @class
 * @param {Typedefs.SpawnOptions} [opts]
 */
class Daemon {
  constructor (opts = { type: 'go' }) {
    const rootPath = process.env.testpath
      ? process.env.testpath
      : __dirname

    this.opts = opts
    const envExec = this.opts.type === 'go' ? process.env.IPFS_GO_EXEC : process.env.IPFS_JS_EXEC
    this.exec = this.opts.exec || envExec || findIpfsExecutable(this.opts.type, rootPath)
    this._env = Object.assign({}, process.env, this.opts.env)
    this.path = this.opts.disposable
      ? tmpDir(this.opts.type === 'js')
      : (this.opts.repoPath || defaultRepo(this.opts.type))
    this.bits = this.opts.initOptions ? this.opts.initOptions.bits : null
    this.disposable = this.opts.disposable
    this.subprocess = null
    this.initialized = fs.existsSync(this.path)
    this.started = false
    this.clean = true
    this.apiAddr = null
    this.gatewayAddr = null
    /** @member {IpfsClient} */
    this.api = null
  }

  setApi (addr) {
    this.apiAddr = multiaddr(addr)
    this.api = (this.opts.IpfsClient || IpfsClient)(addr)
    this.api.apiHost = this.apiAddr.nodeAddress().address
    this.api.apiPort = this.apiAddr.nodeAddress().port
  }

  setGateway (addr) {
    this.gatewayAddr = multiaddr(addr)
    this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
    this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
  }

  /**
   * Current repo path
   *
   * @member {string}
   */
  get repoPath () {
    return this.path
  }

  /**
   * Shell environment variables
   *
   * @member {object}
   */
  get env () {
    return this.path ? Object.assign({}, this._env, { IPFS_PATH: this.path }) : this._env
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOptions={}]
   * @param {number} [initOptions.bits=2048] - The bit size of the identiy key.
   * @param {string} [initOptions.directory=IPFS_PATH] - The location of the repo.
   * @param {string} [initOptions.pass] - The passphrase of the keychain.
   * @returns {Promise}
   */
  async init (initOptions) {
    if (this.initialized && initOptions) {
      throw new Error(`Repo already initialized can't use different options, ${JSON.stringify(initOptions)}`)
    }

    if (this.initialized) {
      this.clean = false
      return this
    }

    initOptions = initOptions || {}

    if (initOptions.directory && initOptions.directory !== this.path) {
      this.path = initOptions.directory
    }

    const bits = initOptions.bits || this.bits
    const args = ['init']
    // do not just set a default keysize,
    // in case we decide to change it at
    // the daemon level in the future
    if (bits) {
      args.push('-b')
      args.push(bits)
    }
    if (initOptions.pass) {
      args.push('--pass')
      args.push('"' + initOptions.pass + '"')
    }
    if (initOptions.profile) {
      // TODO: remove when JS IPFS supports profiles
      if (this.opts.type === 'go') {
        args.push('-p')
        args.push(initOptions.profile)
      } else {
        log(`ignoring "profile" option, not supported for ${this.opts.type} node`)
      }
    }

    await run(this, args, { env: this.env })
      .catch(translateError)
    const conf = await this.getConfig()

    await this.replaceConfig(merge(conf, this.opts.config))

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
   * @param {Array<string>} [flags=[]] - Flags to be passed to the `ipfs daemon` command.
   * @return {Promise}
   */
  start (flags = []) {
    const args = ['daemon'].concat(flags || [])
    // Check if a daemon is already running
    const api = checkForRunningApi(this.path)

    if (api) {
      this.setApi(api)
      this.started = true
      return this.api
    }

    let output = ''

    return new Promise(async (resolve, reject) => { // eslint-disable-line no-async-promise-executor
      this.subprocess = run(this, args, {
        env: this.env,
        stderr: (data) => {
          data = String(data)

          if (data) {
            daemonLog.err(data.trim())
          }
        },
        stdout: (data) => {
          data = String(data)

          if (data) {
            daemonLog.info(data.trim())
          }

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
    // TODO this should call this.api.stop
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
    } = await run(this, ['config', key], {
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
    return setConfigValue(this, key, value)
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
    await run(this, ['config', 'replace', `${tmpFile}`], { env: this.env })
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
    } = await run(this, ['version'], {
      env: this.env
    })
      .catch(translateError)

    return stdout.trim()
  }
}

module.exports = Daemon
