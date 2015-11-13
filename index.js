'use strict'

const fs = require('fs')
const os = require('os')
const join = require('path').join
const run = require('subcomandante')
const async = require('async')
const ipfs = require('ipfs-api')
const multiaddr = require('multiaddr')
const rimraf = require('rimraf')
const shutdown = require('shutdown')

const IPFS_EXEC = require('go-ipfs')
const GRACE_PERIOD = 7500 // amount of ms to wait before sigkill

function configureNode (node, conf, done) {
  if (Object.keys(conf).length > 0) {
    async.forEachOfSeries(conf, (value, key, cb) => {
      const env = {env: node.env}

      run(IPFS_EXEC, ['config', key, '--json', JSON.stringify(value)], env)
        .on('error', cb)
        .on('end', cb)
    }, done)
  } else {
    done()
  }
}

function tempDir () {
  return join(os.tmpdir(), `ipfs_${(Math.random() + '').substr(2)}`)
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

function Node (path, opts, disposable) {
  const env = Object.assign({}, process.env, {IPFS_PATH: path})

  if (opts.env) Object.assign(env, opts.env)

  return {
    subprocess: null,
    initialized: fs.existsSync(path),
    clean: true,
    path: path,
    opts: opts,
    env: env,
    init (initOpts, done) {
      if (!done) {
        done = initOpts
        initOpts = {}
      }
      let buf = ''

      const keySize = initOpts.keysize || 2048

      if (initOpts.directory && initOpts.directory !== path) {
        path = initOpts.directory
        this.env.IPFS_PATH = path
      }

      run(IPFS_EXEC, ['init', '-b', keySize], {env: this.env})
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

      if (disposable) {
        shutdown.addHandler('disposable', 1, this.shutdown.bind(this))
      }
    },
    // cleanup tmp files
    shutdown (done) {
      if (!this.clean && disposable) {
        rimraf(this.path, err => {
          if (err) throw err
          done()
        })
      }
    },
    startDaemon (done) {
      parseConfig(this.path, (err, conf) => {
        if (err) return done(err)

        this.subprocess = run(IPFS_EXEC, ['daemon'], {env: this.env})
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
    },
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
    },
    daemonPid () {
      return this.subprocess && this.subprocess.pid
    },
    getConfig (key, done) {
      if (typeof key === 'function') {
        done = key
        key = ''
      }
      let result = ''
      run(IPFS_EXEC, ['config', key], {env: this.env})
        .on('error', done)
        .on('data', data => result += data)
        .on('end', () => done(null, result.trim()))
    },
    setConfig (key, value, done) {
      run(IPFS_EXEC, ['config', key, value, '--json'], {env: this.env})
        .on('error', done)
        .on('data', data => {})
        .on('end', () => done())
    },
    replaceConf (file, done) {
      let result = ''
      run(IPFS_EXEC, ['config', 'replace', file], {env: this.env})
        .on('error', done)
        .on('data', data => result += data)
        .on('end', () => done(null, result.trim()))
    }
  }
}

module.exports = {
  version (done) {
    let buf = ''
    run(IPFS_EXEC, ['version'])
      .on('error', done)
      .on('data', data => buf += data)
      .on('end', () => done(null, buf))
  },
  local (path, done) {
    if (!done) {
      done = path
      path = process.env.IPFS_PATH ||
        join(process.env.HOME ||
             process.env.USERPROFILE, '.ipfs')
    }
    done(null, new Node(path, {}))
  },
  disposableApi (opts, done) {
    if (typeof opts === 'function') {
      done = opts
      opts = {}
    }
    this.disposable(opts, (err, node) => {
      if (err) return done(err)
      node.startDaemon((err, api) => {
        if (err) return done(err)
        done(null, api)
      })
    })
  },
  disposable (opts, done) {
    if (typeof opts === 'function') {
      done = opts
      opts = {}
    }
    opts['Addresses.Swarm'] = ['/ip4/0.0.0.0/tcp/0']
    opts['Addresses.Gateway'] = ''
    opts['Addresses.API'] = '/ip4/127.0.0.1/tcp/0'
    const node = new Node(tempDir(), opts, true)
    node.init(err => {
      if (err) return done(err)
      done(null, node)
    })
  }
}
