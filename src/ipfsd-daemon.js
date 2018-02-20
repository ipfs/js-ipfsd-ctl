'use strict'

const fs = require('fs')
const waterfall = require('async/waterfall')
const series = require('async/series')
const ipfs = require('ipfs-api')
const multiaddr = require('multiaddr')
const rimraf = require('rimraf')
const path = require('path')
const once = require('once')
const truthy = require('truthy')
const defaults = require('lodash.defaults')
const debug = require('debug')
const os = require('os')
const hat = require('hat')
const log = debug('ipfsd-ctl:daemon')

const safeParse = require('safe-json-parse/callback')
const safeStringify = require('safe-json-stringify')

const parseConfig = require('./utils/parse-config')
const tmpDir = require('./utils/tmp-dir')
const findIpfsExecutable = require('./utils/find-ipfs-executable')
const setConfigValue = require('./utils/set-config-value')
const run = require('./utils/run')

const GRACE_PERIOD = 10500 // amount of ms to wait before sigkill

/**
 * ipfsd for a go-ipfs or js-ipfs daemon
 */
class Daemon {
  /**
   * Create a new node.
   *
   * @param {Object} [opts]
   * @param {Object} [opts.env={}] - Additional environment settings, passed to executing shell.
   * @returns {Node}
   */
  constructor (opts) {
    const rootPath = process.env.testpath
      ? process.env.testpath
      : __dirname

    const type = truthy(process.env.IPFS_TYPE)

    this.opts = opts || { type: type || 'go' }
    const td = tmpDir(opts.type === 'js')
    this.path = this.opts.disposable
      ? td
      : (this.opts.repoPath || td)
    this.disposable = this.opts.disposable
    this.exec = this.opts.exec || process.env.IPFS_EXEC || findIpfsExecutable(this.opts.type, rootPath)
    this.subprocess = null
    this.initialized = fs.existsSync(path)
    this.clean = true
    this._apiAddr = null
    this._gatewayAddr = null
    this._started = false
    this.api = null
    this.bits = process.env.IPFS_KEYSIZE || (this.opts.initOptions ? this.opts.initOptions.bits : null)

    if (this.opts.env) {
      Object.assign(this.env, this.opts.env)
    }
  }

  /**
   * Get the address of connected IPFS API.
   *
   * @returns {Multiaddr}
   */
  get apiAddr () {
    return this._apiAddr
  }

  /**
   * Get the address of connected IPFS HTTP Gateway.
   *
   * @returns {Multiaddr}
   */
  get gatewayAddr () {
    return this._gatewayAddr
  }

  /**
   * Get the current repo path
   *
   * @return {string}
   */
  get repoPath () {
    return this.path
  }

  /**
   * Is the node started
   *
   * @return {boolean}
   */
  get started () {
    return this._started
  }

  /**
   * Is the environment
   *
   * @return {object}
   */
  get env () {
    return this.path ? Object.assign({}, process.env, { IPFS_PATH: this.path }) : process.env
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOptions={}]
   * @param {number} [initOptions.bits=2048] - The bit size of the identiy key.
   * @param {string} [initOptions.directory=IPFS_PATH] - The location of the repo.
   * @param {string} [initOptions.pass] - The passphrase of the keychain.
   * @param {function (Error, Node)} callback
   * @returns {undefined}
   */
  init (initOptions, callback) {
    if (!callback) {
      callback = initOptions
      initOptions = {}
    }

    if (initOptions.directory && initOptions.directory !== this.path) {
      this.path = initOptions.directory
    }

    const bits = initOptions.bits || this.bits
    const args = ['init']
    // do not just set a default keysize,
    // in case we decide to change it at
    // the daemon level in the future
    if (bits) {
      args.concat(['-b', bits])
      log(`initializing with keysize: ${bits}`)
    }
    if (initOptions.pass) {
      args.push('--pass')
      args.push('"' + initOptions.pass + '"')
    }
    run(this, args, { env: this.env }, (err, result) => {
      if (err) {
        return callback(err)
      }

      const self = this
      waterfall([
        (cb) => this.getConfig(cb),
        (conf, cb) => this.replaceConfig(defaults({}, this.opts.config, conf), cb)
      ], (err) => {
        if (err) { return callback(err) }
        self.clean = false
        self.initialized = true
        return callback()
      })
    })
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @param {function(Error)} callback
   * @returns {undefined}
   */
  cleanup (callback) {
    if (this.clean) {
      return callback()
    }

    this.clean = true
    rimraf(this.path, callback)
  }

  /**
   * Start the daemon.
   *
   * @param {Array<string>} [flags=[]] - Flags to be passed to the `ipfs daemon` command.
   * @param {function(Error, IpfsApi)} callback
   * @returns {undefined}
   */
  start (flags, callback) {
    if (typeof flags === 'function') {
      callback = flags
      flags = []
    }
    if (typeof flags === 'object' && Object.keys(flags).length === 0) {
      flags = []
    }

    const args = ['daemon'].concat(flags || [])

    callback = once(callback)

    parseConfig(this.path, (err, conf) => {
      if (err) {
        return callback(err)
      }

      let output = ''
      this.subprocess = run(this, args, { env: this.env }, {
        error: (err) => {
          // Only look at the last error
          const input = String(err)
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(-1)[0] || ''

          if (input.match(/(?:daemon is running|Daemon is ready)/)) {
            // we're good
            return callback(null, this.api)
          }
          // ignore when kill -9'd
          if (!input.match('non-zero exit code')) {
            callback(err)
          }
        },
        data: (data) => {
          output += String(data)

          const apiMatch = output.trim().match(/API (?:server|is) listening on[:]? (.*)/)
          const gwMatch = output.trim().match(/Gateway (?:.*) listening on[:]?(.*)/)

          if (apiMatch && apiMatch.length > 0) {
            this._apiAddr = multiaddr(apiMatch[1])
            this.api = ipfs(apiMatch[1])
            this.api.apiHost = this.apiAddr.nodeAddress().address
            this.api.apiPort = this.apiAddr.nodeAddress().port
          }

          if (gwMatch && gwMatch.length > 0) {
            this._gatewayAddr = multiaddr(gwMatch[1])
            this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
            this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
          }

          if (output.match(/(?:daemon is running|Daemon is ready)/)) {
            // we're good
            this._started = true
            return callback(null, this.api)
          }
        }
      })
    })
  }

  /**
   * Stop the daemon.
   *
   * @param {function(Error)} callback
   * @returns {undefined}
   */
  stop (callback) {
    callback = callback || function noop () {}

    if (!this.subprocess) {
      return callback()
    }

    this.killProcess(callback)
  }

  /**
   * Kill the `ipfs daemon` process.
   *
   * First `SIGTERM` is sent, after 10.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   *
   * @param {function()} callback - Called when the process was killed.
   * @returns {undefined}
   */
  killProcess (callback) {
    // need a local var for the closure, as we clear the var.
    const subprocess = this.subprocess
    const timeout = setTimeout(() => {
      log('kill timeout, using SIGKILL', subprocess.pid)
      subprocess.kill('SIGKILL')
      callback()
    }, GRACE_PERIOD)

    const disposable = this.disposable
    const clean = this.cleanup.bind(this)
    subprocess.once('close', () => {
      log('killed', subprocess.pid)
      clearTimeout(timeout)
      this.subprocess = null
      this._started = false
      if (disposable) {
        return clean(callback)
      }
      callback()
    })

    log('killing', subprocess.pid)
    subprocess.kill('SIGTERM')
    this.subprocess = null
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @param {function()} callback - receives the pid
   * @returns {undefined}
   */
  pid (callback) {
    callback(this.subprocess && this.subprocess.pid)
  }

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   *
   * @param {string} [key] - A specific config to retrieve.
   * @param {function(Error, (Object|string))} callback
   * @returns {undefined}
   */
  getConfig (key, callback) {
    if (typeof key === 'function') {
      callback = key
      key = 'show'
    }
    if (!key) {
      key = 'show'
    }

    waterfall([
      (cb) => run(
        this,
        ['config', key],
        { env: this.env },
        cb
      ),
      (config, cb) => {
        if (key === 'show') {
          return safeParse(config, cb)
        }
        cb(null, config.trim())
      }
    ], callback)
  }

  /**
   * Set a config value.
   *
   * @param {string} key
   * @param {string} value
   * @param {function(Error)} callback
   * @returns {undefined}
   */
  setConfig (key, value, callback) {
    setConfigValue(this, key, value, callback)
  }

  /**
   * Replace the current config with the provided one
   *
   * @param {object} config
   * @param {function(Error)} callback
   * @return {undefined}
   */
  replaceConfig (config, callback) {
    const tmpFile = path.join(os.tmpdir(), hat())
    // I wanted to use streams here, but js-ipfs doesn't
    // read from stdin when providing '-' (or piping) like
    // go-ipfs, and adding it right now seems like a fair
    // bit of work, so we're using tmp file for now - not ideal...
    series([
      (cb) => fs.writeFile(tmpFile, safeStringify(config), cb),
      (cb) => run(
        this,
        ['config', 'replace', `${tmpFile}`],
        { env: this.env },
        cb
      )
    ], (err) => {
      if (err) { return callback(err) }
      fs.unlink(tmpFile, callback)
    })
  }

  /**
   * Get the version of ipfs
   *
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  version (callback) {
    run(this, ['version'], { env: this.env }, callback)
  }
}

module.exports = Daemon
