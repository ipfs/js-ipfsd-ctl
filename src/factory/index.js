'use strict'

const isNode = require('detect-node')
const Local = require('./local-factory')
const Remote = require('./remote-factory')

class Factory {
  constructor (opts) {
    this.factory = isNode ? new Local() : new Remote(opts)
  }

  spawnNode (repoPath, opts, callback) {
    this.factory.spawnNode(repoPath, opts, callback)
  }

  dismantle (callback) {
    this.factory.dismantle(callback)
  }
}

module.exports = Factory
