'use strict'

const fs = require('fs')
const join = require('path').join
const run = require('subcomandante')
const async = require('async')
const ipfs = require('ipfs-api')
const multiaddr = require('multiaddr')
const rimraf = require('rimraf')
const shutdown = require('shutdown')

const ipfsDefaultPath = require('go-ipfs')
const GRACE_PERIOD = 7500 // amount of ms to wait before sigkill

function configureNode (node, conf, done) {
  if (Object.keys(conf).length > 0) {
    async.forEachOfSeries(conf, (value, key, cb) => {
      const env = {env: node.env}

      run(node.exec, ['config', key, '--json', JSON.stringify(value)], env)
        .on('error', cb)
        .on('end', cb)
    }, done)
  } else {
    done()
  }
}

// Consistent error handling
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
    this.exec = process.env.IPFS_EXEC || ipfsDefaultPath
    this.subprocess = null
    this.initialized = fs.existsSync(path)
    this.clean = true
    this.env = Object.assign({}, process.env, {IPFS_PATH: path})

    if (this.opts.env) Object.assign(this.env, this.opts.env)
  }

  _run (args, envArg, done) {
    let result = ''
    run(this.exec, args, envArg)
      .on('error', done)
      .on('data', data => result += data)
      .on('end', () => done(null, result.trim()))
  }

  init (initOpts, done) {
    if (!done) {
      done = initOpts
      initOpts = {}
    }
    let buf = ''

    const keySize = initOpts.keysize || 2048

    if (initOpts.directory && initOpts.directory !== this.path) {
      this.path = initOpts.directory
      this.env.IPFS_PATH = this.path
    }

    run(this.exec, ['init', '-b', keySize], {env: this.env})
      .on('error', done)
      .on('data', data => buf += data)
      .on('end', () => {
        configureNode(this, this.opts, err => {
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
    if (!this.clean && this.disposable) {
      rimraf(this.path, err => {
        if (err) throw err
        done()
      })
    }
  }

  startDaemon (done) {
    parseConfig(this.path, (err, conf) => {
      if (err) return done(err)

      this.subprocess = run(this.exec, ['daemon'], {env: this.env})
        .on('error', err => {
          if ((err + '').match('daemon is running')) {
            // we're good
            done(null, ipfs(conf.Addresses.API))
          } else if ((err + '').match('non-zero exit code')) {
            // ignore when kill -9'd
          } else {
            done(err)
          }
        })
        .on('data', data => {
          const match = (data + '').trim().match(/API server listening on (.*)/)
          if (match) {
            this.apiAddr = match[1]
            const addr = multiaddr(this.apiAddr).nodeAddress()
            const api = ipfs(this.apiAddr)
            api.apiHost = addr.address
            api.apiPort = addr.port
            done(null, api)
          }
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
    }, GRACE_PERIOD)

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
    run(this.exec, ['config', key, value, '--json'], {env: this.env})
      .on('error', done)
      .on('data', data => {})
      .on('end', () => done())
  }

  replaceConf (file, done) {
    this._run(['config', 'replace', file], {env: this.env}, done)
  }

  version (done) {
    this._run(['version'], {}, done)
  }
}
