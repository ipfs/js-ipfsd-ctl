'use strict'

const fs = require('fs')
const run = require('subcomandante')
const series = require('run-series')
const ipfs = require('ipfs-api')
const multiaddr = require('multiaddr')
const rimraf = require('rimraf')
const shutdown = require('shutdown')
const path = require('path')
const join = path.join
const bl = require('bl')
const once = require('once')

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

function configureNode (node, conf, done) {
  const keys = Object.keys(conf)
  series(keys.map((key) => (cb) => {
    const value = conf[key]
    const env = {env: node.env}

    run(node.exec, ['config', key, '--json', JSON.stringify(value)], env)
      .on('error', cb)
      .on('end', cb)
  }), done)
}

// Consistent error handling
function parseConfig (path, done) {
  const file = fs.readFileSync(join(path, 'config'))

  try {
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
    run(this.exec, args, envArg)
      .on('error', done)
      .pipe(bl((err, result) => {
        if (err) {
          return done(err)
        }

        done(null, result.toString().trim())
      }))
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

    run(this.exec, ['init', '-b', keySize], {env: this.env})
      .on('error', done)
      .pipe(bl((err, buf) => {
        if (err) return done(err)

        configureNode(this, this.opts, (err) => {
          if (err) {
            return done(err)
          }

          this.clean = false
          this.initialized = true

          done(null, this)
        })
      }))

    if (this.disposable) {
      shutdown.addHandler('disposable', 1, this.shutdown.bind(this))
    }
  }

  // cleanup tmp files
  // TODO: this is a bad name for a function. a user may call this expecting
  // something similar to "stopDaemon()". consider changing it. - @jbenet
  shutdown (done) {
    if (!this.clean && this.disposable) {
      rimraf(this.path, (err) => {
        if (err) throw err
        done()
      })
    }
  }

  startDaemon (flags, done) {
    if (typeof flags === 'function' && typeof done === 'undefined') {
      done = flags
      flags = []
    }

    const node = this
    parseConfig(node.path, (err, conf) => {
      if (err) return done(err)

      let stdout = ''
      let args = ['daemon'].concat(flags || [])

      // strategy:
      // - run subprocess
      // - listen for API addr on stdout (success)
      // - or an early exit or error (failure)
      node.subprocess = run(node.exec, args, {env: node.env})
      node.subprocess.on('error', onErr)
        .on('data', onData)

      // done2 is called to call done after removing the event listeners
      let done2 = (err, val) => {
        node.subprocess.removeListener('data', onData)
        node.subprocess.removeListener('error', onErr)
        if (err) {
          node.killProcess(() => {}) // we failed. kill, just to be sure...
        }
        done(err, val)
        done2 = () => {} // in case it gets called twice
      }

      function onErr (err) {
        if (String(err).match('daemon is running')) {
          // we're good
          done2(null, ipfs(conf.Addresses.API))

          // TODO: I don't think this case is OK at all...
          // When does the daemon outout "daemon is running" ?? seems old.
          // Someone should check on this... - @jbenet
        } else if (String(err).match('non-zero exit code')) {
          // exited with an error on startup, before we removed listeners
          done2(err)
        } else {
          done2(err)
        }
      }

      function onData (data) {
        data = String(data)
        stdout += data

        if (!data.trim().match(/Daemon is ready/)) {
          return // not ready yet, keep waiting.
        }

        const apiM = stdout.match(/API server listening on (.*)\n/)
        if (apiM) {
          // found the API server listening. extract the addr.
          node.apiAddr = apiM[1]
        } else {
          // daemon ready but no API server? seems wrong...
          done2(new Error('daemon ready without api'))
        }

        const gatewayM = stdout.match(/Gateway \((readonly|writable)\) server listening on (.*)\n/)
        if (gatewayM) {
          // found the Gateway server listening. extract the addr.
          node.gatewayAddr = gatewayM[1]
        }

        const addr = multiaddr(node.apiAddr).nodeAddress()
        const api = ipfs(node.apiAddr)
        api.apiHost = addr.address
        api.apiPort = addr.port

        // We are happyly listening, so let's not hide other errors
        node.subprocess.removeListener('error', onErr)

        done2(null, api)
      }
    })
  }

  stopDaemon (done) {
    if (!done) {
      done = () => {}
    }

    if (!this.subprocess) {
      return done()
    }

    this.killProcess(done)
  }

  killProcess (done) {
    // need a local var for the closure, as we clear the var.
    const subprocess = this.subprocess
    const timeout = setTimeout(() => {
      subprocess.kill('SIGKILL')
      done()
    }, GRACE_PERIOD)

    subprocess.on('close', () => {
      clearTimeout(timeout)
      this.subprocess = null
      done()
    })

    subprocess.kill('SIGTERM')
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
    done = once(done)
    run(this.exec, ['config', key, value, '--json'], {env: this.env})
      .on('error', done)
      .on('data', () => {})
      .on('end', () => done())
  }

  replaceConf (file, done) {
    this._run(['config', 'replace', file], {env: this.env}, done)
  }

  version (done) {
    this._run(['version'], {}, done)
  }
}
