'use strict'

const os = require('os')
const join = require('path').join

const Node = require('./node')

function tempDir () {
  return join(os.tmpdir(), `ipfs_${String(Math.random()).substr(2)}`)
}

module.exports = {
  version (done) {
    (new Node()).version(done)
  },
  local (path, done) {
    if (!done) {
      done = path
      path = process.env.IPFS_PATH ||
        join(process.env.HOME ||
             process.env.USERPROFILE, '.ipfs')
    }
    process.nextTick(() => {
      done(null, new Node(path))
    })
  },
  disposableApi (opts, done) {
    if (typeof opts === 'function') {
      done = opts
      opts = {}
    }
    this.disposable(opts, (err, node) => {
      if (err) return done(err)
      node.startDaemon(done)
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

    if (opts.apiAddr) {
      opts['Addresses.API'] = opts.apiAddr
    }

    if (opts.gatewayAddr) {
      opts['Addresses.Gateway'] = opts.gatewayAddr
    }

    const node = new Node(opts.repoPath || tempDir(), opts, true)

    if (typeof opts.init === 'boolean' && opts.init === false) {
      process.nextTick(() => {
        done(null, node)
      })
    } else {
      node.init((err) => {
        done(err, node)
      })
    }
  }
}
