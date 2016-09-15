'use strict'

const os = require('os')
const join = require('path').join

const Node = require('./node')

function tempDir () {
  return join(os.tmpdir(), `ipfs_${String(Math.random()).substr(2)}`)
}

const defaultOptions = {
  'Addresses.Swarm': ['/ip4/0.0.0.0/tcp/0'],
  'Addresses.Gateway': '',
  'Addresses.API': '/ip4/127.0.0.1/tcp/0',
  disposable: true,
  init: true
}

module.exports = {
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
  create (opts, done) {
    if (typeof opts === 'function') {
      done = opts
      opts = {}
    }

    let options = {}
    Object.assign(options, defaultOptions, opts || {})

    const repoPath = options.repoPath || tempDir()
    const disposable = options.disposable
    delete options.disposable
    delete options.repoPath

    const node = new Node(repoPath, options, disposable)

    if (typeof options.init === 'boolean' && options.init === false) {
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
