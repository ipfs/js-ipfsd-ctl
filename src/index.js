'use strict'

const localController = require('./local')
const remote = require('./remote')
const isNode = require('detect-node')
const defaults = require('lodash.defaultsdeep')

function controllerFactory (opts) {
  const options = defaults({}, opts, { remote: !isNode })

  if (options.remote) {
    return remote.remoteController(options.port)
  }

  return localController
}

controllerFactory.server = remote.server

module.exports = controllerFactory
