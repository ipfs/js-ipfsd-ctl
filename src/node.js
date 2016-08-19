'use strict'

const fs = require('fs')
const series = require('run-series')
const ipfs = require('ipfs-api')
const multiaddr = require('multiaddr')
const rimraf = require('rimraf')
const shutdown = require('shutdown')
const BinWrapper = require('bin-wrapper')
const path = require('path')
const join = path.join

const config = require('./config')
const exec = require('./exec')

const bin = new BinWrapper()
  .src(config.baseUrl + 'darwin-386.tar.gz', 'darwin', 'ia32')
  .src(config.baseUrl + 'darwin-amd64.tar.gz', 'darwin', 'x64')
  .src(config.baseUrl + 'freebsd-amd64.tar.gz', 'freebsd', 'x64')
  .src(config.baseUrl + 'linux-386.tar.gz', 'linux', 'ia32')
  .src(config.baseUrl + 'linux-amd64.tar.gz', 'linux', 'x64')
  .src(config.baseUrl + 'linux-arm.tar.gz', 'linux', 'arm')
  .src(config.baseUrl + 'windows-386.tar.gz', 'win32', 'ia32')
  .src(config.baseUrl + 'windows-amd64.tar.gz', 'win32', 'x64')
  .use(process.platform === 'win32' ? 'ipfs.exe' : 'ipfs')

function configureNode (node, conf, done) {
  const keys = Object.keys(conf)
  series(keys.map((key) => (cb) => {
    const value = conf[key]
    const env = {env: node.env}

    node._run(['config', key, '--json', JSON.stringify(value)], env, cb)
  }), done)
}

function parseConfig (path, done) {
  try {
    const file = fs.readFileSync(join(path, 'config'))
    const parsed = JSON.parse(file)
    done(null, parsed)
  } catch (err) {
    done(err)
  }
}

module.exports = class Node {
  constructor (path, opts, disposable) {
    this.path = path
    this.opts = opts || {}
    // Set dest on bin wrapper
    bin.dest(process.env.IPFS_EXEC || config.defaultExecPath)
    this.exec = bin.path()

    this.subprocess = null
    this.initialized = fs.existsSync(path)
    this.clean = true
    this.disposable = disposable
    // Has the binary been checked?
    this.checked = false

    this.env = Object.assign({}, process.env, {IPFS_PATH: path})
    if (this.opts.env) Object.assign(this.env, this.opts.env)
  }

  _run (args, opts = {}, listeners, done) {
    let result = ''
    let callback
    // Cleanup the process on exit
    opts.cleanup = true
    // Handy method if we just want the result and err returned in a callback
    if (typeof listeners === 'function') {
      callback = listeners
      listeners = {
        error: callback,
        data: (data) => {
          result += data
        },
        end: () => callback(null, result.trim())
      }
    }
    series([
      // Check the binary and download it if needed be
      (cb) => {
        if (this.checked) return cb()
        bin.run(['version'], (err) => {
          if (!err) this.checked = true
          return cb(err)
        })
      }
    ], (err, results) => {
      if (err) {
        // If no done callback return error to the error listener
        if (!done) return listeners.error(err)
        return done(err)
      }
      const command = exec(this.exec, args, opts, listeners)

      // If done callback return process
      if (done) done(null, command)
    })
  }

  init (initOpts, done) {
    if (!done) {
      done = initOpts
      initOpts = {}
    }

    const keySize = initOpts.keysize || 2048

    if (initOpts.directory && initOpts.directory !== this.path) {
      this.path = initOpts.directory
      this.env.IPFS_PATH = this.path
    }

    this._run(['init', '-b', keySize], {env: this.env}, (err, result) => {
      if (err) return done(err)
      configureNode(this, this.opts, (err) => {
        if (err) return done(err)
        this.clean = false
        this.initialized = true
        done(null, this)
      })
    })

    if (this.disposable) {
      shutdown.addHandler('disposable', 1, this.shutdown.bind(this))
    }
  }

  // cleanup tmp files
  shutdown (done) {
    if (this.clean || !this.disposable) return done()
    rimraf(this.path, done)
  }

  startDaemon (done) {
    parseConfig(this.path, (err, conf) => {
      if (err) return done(err)

      this._run(['daemon'], {env: this.env}, {
        error: (err) => {
          if (String(err).match('daemon is running')) {
            // we're good
            done(null, ipfs(conf.Addresses.API))
          } else if (String(err).match('non-zero exit code')) {
            // ignore when kill -9'd
          } else {
            done(err)
          }
        },
        data: (data) => {
          const match = String(data).trim().match(/API server listening on (.*)/)
          if (match) {
            this.apiAddr = match[1]
            const addr = multiaddr(this.apiAddr).nodeAddress()
            const api = ipfs(this.apiAddr)
            api.apiHost = addr.address
            api.apiPort = addr.port
            done(null, api)
          }
        }
      }, (err, process) => {
        if (err) return done(err)
        this.subprocess = process
      })
    })
  }

  stopDaemon (done) {
    if (!done) done = () => {}
    if (!this.subprocess) return done(null)

    this.subprocess.kill('SIGTERM')

    const timeout = setTimeout(() => {
      this.subprocess.kill('SIGKILL')
      done(null)
    }, config.gracePeriod)

    this.subprocess.on('close', () => {
      clearTimeout(timeout)
      done(null)
    })

    this.subprocess = null
  }

  daemonPid () {
    return this.subprocess && this.subprocess.pid
  }

  getConfig (key, done) {
    if (typeof key === 'function') {
      done = key
      key = ''
    }

    this._run(['config', key], {env: this.env}, done)
  }

  setConfig (key, value, done) {
    this._run(['config', key, value, '--json'], {env: this.env}, done)
  }

  replaceConf (file, done) {
    this._run(['config', 'replace', file], {env: this.env}, done)
  }

  version (done) {
    this._run(['version'], {}, done)
  }
}
