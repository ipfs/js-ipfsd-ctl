'use strict'

const isNode = require('detect-node')
const defaults = require('lodash.defaultsdeep')

const FactoryDaemon = require('./factory-daemon')
const FactoryInProc = require('./factory-in-proc')
const FactoryClient = require('./factory-client')
const EndpointServer = require('./endpoint/server')


/**
 * Create a Factory
 *
 * @param {Object} [opts={}]
 * @returns {(FactoryInProc|FactoryDaemon|FactoryClient)}
 */
const create = (opts) => {
  const options = defaults({}, opts, { remote: !isNode })

  if (options.type === 'proc') {
    return new FactoryInProc(options)
  } else if (options.remote) {
    return new FactoryClient(options)
  } else {
    return new FactoryDaemon(options)
  }
}

/**
 * Create a Endpoint Server
 *
 * @param {Object|number} options
 * @returns {EndpointServer}
 */
const createServer = (options) => {
  if (typeof options === 'number') {
    options = { port: options }
  }
  return new EndpointServer(options)
}

module.exports = {
  create,
  createServer
}