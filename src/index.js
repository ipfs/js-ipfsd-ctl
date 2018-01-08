'use strict'

const LocalController = require('./daemon-ctrl')
const remote = require('./remote-node')
const isNode = require('detect-node')
const defaults = require('lodash.defaultsdeep')

class DaemonFactory {
  static create (opts) {
    const options = defaults({}, opts, { remote: !isNode })

    if (options.remote && options.type === 'proc') {
      options.remote = false
    }

    if (options.remote) {
      return new remote.RemoteController(options)
    }

    return new LocalController(options)
  }

  static createServer (port) {
    return new remote.Server(port)
  }
}

module.exports = DaemonFactory
