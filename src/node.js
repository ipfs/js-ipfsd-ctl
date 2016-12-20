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

function run (cmd, args, opts, handlers) {
  opts = opts || {}

  // Cleanup the process on exit
  opts.cleanup = true

  return exec(cmd, args, opts, handlers)
}

function setConfigValue (node, key, value, callback) {
  run(
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

module.exports = class Node {
  constructor (path, opts, disposable) {
    this.path = path
    this.opts = opts || {}
    this.exec = process.env.IPFS_EXEC || ipfsDefaultPath
    this.subprocess = null
    this.initialized = fs.existsSync(path)
    this.clean = true
    this.env = Object.assign({}, process.env, {IPFS_PATH: path})
    this.disposable = disposable

    if (this.opts.env) {
      Object.assign(this.env, this.opts.env)
    }
  }

  _run (args, opts, callback) {
    run(this.exec, args, opts, callback)
  }

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

  // cleanup tmp files
  shutdown (callback) {
    if (this.clean || !this.disposable) {
      return callback()
    }

    rimraf(this.path, callback)
  }

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

      this._run(args, {env: this.env}, {
        error: (err) => {
          if (String(err).match('daemon is running')) {
            // we're good
            return callback()
          }
          // ignore when kill -9'd
          if (!String(err).match('non-zero exit code')) {
            callback(err)
          }
        },
        data: (data) => {
          const match = String(data).trim().match(/API server listening on (.*)/)

          if (match) {
            this.apiAddr = match[1]
            const addr = multiaddr(this.apiAddr).nodeAddress()
            this.api = ipfs(this.apiAddr)
            this.api.apiHost = addr.address
            this.api.apiPort = addr.port

            callback(null, this.api)
          }
        }
      }, (err, process) => {
        if (err) {
          return callback(err)
        }
        this.subprocess = process
      })
    })
  }

  stopDaemon (callback) {
    if (!callback) {
      callback = () => {}
    }

    if (!this.subprocess) {
      return callback()
    }

    this.killProcess(callback)
  }

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

  daemonPid () {
    return this.subprocess && this.subprocess.pid
  }

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

  setConfig (key, value, callback) {
    this._run(
      ['config', key, value, '--json'],
      {env: this.env},
      callback
    )
  }

  replaceConf (file, callback) {
    this._run(
      ['config', 'replace', file],
      {env: this.env},
      callback
    )
  }

  version (callback) {
    this._run(['version'], {env: this.env}, callback)
  }
}
