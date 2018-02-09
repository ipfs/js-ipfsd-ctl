'use strict'

const isNode = require('detect-node')
const defaults = require('lodash.defaultsdeep')

const LocalDaemonFactory = require('./daemon-factory')
const RemoteDaemonFactory = require('./remote/daemon-factory-client')
const RemoteServer = require('./remote/server')

exports = module.exports

exports.create = (opts) => {
  const options = defaults({}, opts, { remote: !isNode })

  if (options.type === 'proc') { options.remote = false }

  return options.remote
    ? new RemoteDaemonFactory(options)
    : new LocalDaemonFactory(options)
}

exports.createServer = (port) => {
  return new RemoteServer(port)
}
