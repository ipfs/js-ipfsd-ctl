'use strict'

const fs = require('fs')
const async = require('async')
const ipfs = require('ipfs-api')
const multiaddr = require('multiaddr')
const rimraf = require('rimraf')
const shutdown = require('shutdown')
const path = require('path')
const join = path.join
const once = require('once')
const os = require('os')
const truthy = require('truthy')

const isWindows = os.platform() === 'win32'

const exec = require('./exec')

const GRACE_PERIOD = 10500 // amount of ms to wait before sigkill

function findIpfsExecutable (isJs, rootPath) {
  let appRoot = path.join(rootPath, '..')
  // If inside <appname>.asar try to load from .asar.unpacked
  // this only works if asar was built with
  // asar --unpack-dir=node_modules/go-ipfs-dep/* (not tested)
  // or
  // electron-packager ./ --asar.unpackDir=node_modules/go-ipfs-dep
  if (appRoot.includes(`.asar${path.sep}`)) {
    appRoot = appRoot.replace(`.asar${path.sep}`, `.asar.unpacked${path.sep}`)
  }
  const appName = isWindows ? 'ipfs.exe' : 'ipfs'
  const depPath = isJs
    ? path.join('ipfs', 'src', 'cli', 'bin.js')
    : path.join('go-ipfs-dep', 'go-ipfs', appName)
  const npm3Path = path.join(appRoot, '../', depPath)
  const npm2Path = path.join(appRoot, 'node_modules', depPath)

  if (fs.existsSync(npm3Path)) {
    return npm3Path
  }
  if (fs.existsSync(npm2Path)) {
    return npm2Path
  }

  throw new Error('Cannot find the IPFS executable')
}

function setConfigValue (node, key, value, callback) {
  exec(
    node.exec,
    ['config', key, value, '--json'],
    { env: node.env },
    callback
  )
}

function configureNode (node, conf, callback) {
  async.eachOfSeries(conf, (value, key, cb) => {
    setConfigValue(node, key, JSON.stringify(value), cb)
  }, callback)
}

function tryJsonParse (input, callback) {
  let res
  try {
    res = JSON.parse(input)
  } catch (err) {
    return callback(err)
  }
  callback(null, res)
}

// Consistent error handling
function parseConfig (path, callback) {
  async.waterfall([
    (cb) => fs.readFile(join(path, 'config'), cb),
    (file, cb) => tryJsonParse(file.toString(), cb)
  ], callback)
}

function tempDir (isJs) {
  return join(os.tmpdir(), `${isJs ? 'jsipfs' : 'ipfs'}_${String(Math.random()).substr(2)}`)
}

/**
 * Controll a go-ipfs node.
 */
class Node {
  /**
   * Create a new node.
   *
   * @param {Object} [opts]
   * @param {Object} [opts.env={}] - Additional environment settings, passed to executing shell.
   * @returns {Node}
   */
  constructor (opts) {
    const rootPath = process.env.testpath ? process.env.testpath : __dirname
    const isJs = truthy(process.env.IPFS_JS)

    this.opts = opts || { isJs: isJs || false }
    process.env.IPFS_JS = this.opts.isJs

    this.path = this.opts.disposable ? tempDir(isJs) : (this.opts.repoPath || tempDir(isJs))
    this.disposable = this.opts.disposable
    this.exec = process.env.IPFS_EXEC || findIpfsExecutable(this.opts.isJs, rootPath)
    this.subprocess = null
    this.initialized = fs.existsSync(path)
    this.clean = true
    this.env = this.path ? Object.assign({}, process.env, { IPFS_PATH: this.path }) : process.env
    this._apiAddr = null
    this._gatewayAddr = null
    this._started = false

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

  _run (args, opts, callback) {
    return exec(this.exec, args, opts, callback)
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOpts={}]
   * @param {number} [initOpts.keysize=2048] - The bit size of the identiy key.
   * @param {string} [initOpts.directory=IPFS_PATH] - The location of the repo.
   * @param {function (Error, Node)} callback
   * @returns {undefined}
   */
  init (initOpts, callback) {
    if (!callback) {
      callback = initOpts
      initOpts = {}
    }

    const keySize = initOpts.keysize || 2048

    if (initOpts.directory && initOpts.directory !== this.path) {
      this.path = initOpts.directory
      this.env.IPFS_PATH = this.path
    }

    this._run(['init', '-b', keySize], { env: this.env }, (err, result) => {
      if (err) {
        return callback(err)
      }

      configureNode(this, this.opts.config, (err) => {
        if (err) {
          return callback(err)
        }

        this.clean = false
        this.initialized = true
        callback(null, this)
      })
    })

    if (this.disposable) {
      shutdown.addHandler('disposable', 1, this.shutdown.bind(this))
    }
  }

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   *
   * @param {function(Error)} callback
   * @returns {undefined}
   */
  shutdown (callback) {
    if (this.clean || !this.disposable) {
      return callback()
    }

    rimraf(this.path, callback)
  }

  /**
   * Start the daemon.
   *
   * @param {Array<string>} [flags=[]] - Flags to be passed to the `ipfs daemon` command.
   * @param {function(Error, IpfsApi)} callback
   * @returns {undefined}
   */
  startDaemon (flags, callback) {
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

      this.subprocess = this._run(args, { env: this.env }, {
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
  stopDaemon (callback) {
    callback = callback || function noop () {}

    if (!this.subprocess) {
      return callback()
    }

    this.killProcess(callback)
  }

  /**
   * Kill the `ipfs daemon` process.
   *
   * First `SIGTERM` is sent, after 7.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   *
   * @param {function()} callback - Called when the process was killed.
   * @returns {undefined}
   */
  killProcess (callback) {
    // need a local var for the closure, as we clear the var.
    const subprocess = this.subprocess
    const timeout = setTimeout(() => {
      subprocess.kill('SIGKILL')
      callback()
    }, GRACE_PERIOD)

    subprocess.once('close', () => {
      clearTimeout(timeout)
      this.subprocess = null
      callback()
    })

    subprocess.kill('SIGTERM')
    this.subprocess = null
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {number}
   */
  daemonPid () {
    return this.subprocess && this.subprocess.pid
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

    async.waterfall([
      (cb) => this._run(
        ['config', key],
        { env: this.env },
        cb
      ),
      (config, cb) => {
        if (!key) {
          return tryJsonParse(config, cb)
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
   * Replace the configuration with a given file
   *
   * @param {string} file - path to the new config file
   * @param {function(Error)} callback
   * @returns {undefined}
   */
  replaceConf (file, callback) {
    this._run(
      ['config', 'replace', file],
      { env: this.env },
      callback
    )
  }

  /**
   * Get the version of ipfs
   *
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  version (callback) {
    this._run(['version'], { env: this.env }, callback)
  }
}

module.exports = Node
