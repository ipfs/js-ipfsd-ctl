'use strict'

const localController = require('./daemon-ctrl')
const remote = require('./remote-node')
const isNode = require('detect-node')
const defaults = require('lodash.defaultsdeep')

class DaemonFactory {
  static create (opts) {
    const options = defaults({}, opts, { remote: !isNode })

    if (options.remote) {
      return remote.remoteController(options.port)
    }

    return localController
  }

  static createServer (port) {
    return new remote.Server(port)
  }
}

module.exports = DaemonFactory
