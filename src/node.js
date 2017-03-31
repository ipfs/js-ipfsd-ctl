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

const exec = require('./exec')

const ipfsDefaultPath = findIpfsExecutable()

const GRACE_PERIOD = 7500 // amount of ms to wait before sigkill

function findIpfsExecutable () {
  const rootPath = process.env.testpath ? process.env.testpath : __dirname

  const appRoot = path.join(rootPath, '..')
  const depPath = path.join('go-ipfs-dep', 'go-ipfs', 'ipfs')
  const npm3Path = path.join(appRoot, '../', depPath)
  const npm2Path = path.join(appRoot, 'node_modules', depPath)

  try {
    fs.statSync(npm3Path)
    return npm3Path
  } catch (e) {
    return npm2Path
  }
}

function setConfigValue (node, key, value, callback) {
  exec(
    node.exec,
    ['config', key, value, '--json'],
    {env: node.env},
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

/**
 * Controll a go-ipfs node.
 */
class Node {
  /**
   * Create a new node.
   *
   * @param {string} path
   * @param {Object} [opts]
   * @param {Object} [opts.env={}] - Additional environment settings, passed to executing shell.
   * @param {boolean} [disposable=false] - Should this be a temporary node.
   * @returns {Node}
   */
  constructor (path, opts, disposable) {
    this.path = path
    this.opts = opts || {}
    this.exec = process.env.IPFS_EXEC || ipfsDefaultPath
    this.subprocess = null
    this.initialized = fs.existsSync(path)
    this.clean = true
    this.env = Object.assign({}, process.env, {IPFS_PATH: path})
    this.disposable = disposable
    this._apiAddr = null
    this._gatewayAddr = null

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

    this._run(['init', '-b', keySize], {env: this.env}, (err, result) => {
      if (err) {
        return callback(err)
      }

      configureNode(this, this.opts, (err) => {
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

    const args = ['daemon'].concat(flags)

    callback = once(callback)

    parseConfig(this.path, (err, conf) => {
      if (err) {
        return callback(err)
      }

      this.subprocess = this._run(args, {env: this.env}, {
        error: (err) => {
          // Only look at the last error
          const input = String(err)
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
                .slice(-1)[0] || ''

          if (input.match('daemon is running')) {
            // we're good
            return callback(null, this.api)
          }
          // ignore when kill -9'd
          if (!input.match('non-zero exit code')) {
            callback(err)
          }
        },
        data: (data) => {
          const str = String(data).trim()
          const match = str.match(/API server listening on (.*)/)
          const gwmatch = str.match(/Gateway (.*) listening on (.*)/)
          const readyMatch = str.match(/Daemon is ready/)

          if (match) {
            this._apiAddr = multiaddr(match[1])
            this.api = ipfs(match[1])
            this.api.apiHost = this.apiAddr.nodeAddress().address
            this.api.apiPort = this.apiAddr.nodeAddress().port
          }

          if (gwmatch) {
            this._gatewayAddr = multiaddr(gwmatch[2])
            this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
            this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
          }

          if (readyMatch) {
            callback(null, this.api)
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
    if (!callback) {
      callback = () => {}
    }

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
      key = ''
    }

    async.waterfall([
      (cb) => this._run(
        ['config', key],
        {env: this.env},
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
    this._run(
      ['config', key, value, '--json'],
      {env: this.env},
      callback
    )
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
      {env: this.env},
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
    this._run(['version'], {env: this.env}, callback)
  }
}

module.exports = Node
