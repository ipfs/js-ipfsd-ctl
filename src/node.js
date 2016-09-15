'use strict'

const fs = require('fs')
const series = require('run-series')
const IpfsAPI = require('ipfs-api')
const multiaddr = require('multiaddr')
const rimraf = require('rimraf')
const shutdown = require('shutdown')

const path = require('path')
const join = path.join

const config = require('./config')
const exec = require('./exec')
const binary = require('./binary')()

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
    this.exec = binary.path()

    this.subprocess = null
    // Only set when the daemon is started
    this.initialized = fs.existsSync(path)
    this.clean = true
    this.disposable = disposable

    this.env = Object.assign({}, process.env, {IPFS_PATH: path})
    if (this.opts.env) Object.assign(this.env, this.opts.env)
  }

  _run (args, opts, handlers, done) {
    opts = opts || {}
    // If no done callback return error to the error handler
    let errorHandler = done || handlers.error
    // Single handler `callback(err, res)` provided
    if (typeof handlers === 'function') {
      errorHandler = handlers
    }
    // Cleanup the process on exit
    opts.cleanup = true

    binary.check((err) => {
      if (err) return errorHandler(err)
      const command = exec(this.exec, args, opts, handlers)

      // If done callback return command
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
            return done()
          }
          // ignore when kill -9'd
          if (!String(err).match('non-zero exit code')) {
            done(err)
          }
        },
        data: (data) => {
          const match = String(data).trim().match(/API server listening on (.*)/)
          if (match) {
            this.apiAddr = match[1]
            done()
          }
        }
      }, (err, process) => {
        if (err) return done(err)
        this.subprocess = process
      })
    })
  }

  apiCtl () {
    if (!this.apiAddr) return null
    const addr = multiaddr(this.apiAddr).nodeAddress()
    const api = IpfsAPI(addr)
    api.apiHost = addr.address
    api.apiPort = addr.port
    return api
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

  getConfig (key, done) {
    if (typeof key === 'function') {
      done = key
      key = ''
    }

    this._run(['config', key], {env: this.env}, (err, config) => {
      if (err) return done(err)
      try {
        const parsed = JSON.parse(config)
        return done(null, parsed)
      } catch (err) {
        return done(err)
      }
    })
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
