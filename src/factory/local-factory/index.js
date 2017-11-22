'use strict'

const IpfsdCtl = require('../..')
const each = require('async/each')
const waterfall = require('async/waterfall')

class Factory {
  constructor () {
    this.nodes = []
  }

  /* yields a new started node */
  spawnNode (repoPath, opts, callback) {
    if (typeof repoPath === 'function') {
      callback = repoPath
      repoPath = null
    }
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }

    opts = Object.assign({}, opts, { repoPath })

    waterfall([
      (cb) => IpfsdCtl.disposable(opts, cb),
      (node, cb) => {
        this.nodes.push(node)
        node.startDaemon(['--enable-pubsub-experiment'], cb)
      }
    ], callback)
  }

  dismantle (callback) {
    each(this.nodes, (node, cb) => node.stopDaemon(cb), callback)
  }
}

module.exports = Factory
