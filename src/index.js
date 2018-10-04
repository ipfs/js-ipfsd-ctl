'use strict'

const isNode = require('detect-node')
const defaults = require('lodash.defaultsdeep')

const FactoryDaemon = require('./factory-daemon')
const FactoryInProc = require('./factory-in-proc')
const FactoryClient = require('./factory-client')
const EndpointServer = require('./endpoint/server')

exports = module.exports

exports.create = (opts) => {
  if (typeof opts === 'function') { // support .create(require('ipfs-pregen-ids'))
    opts = {pregen: opts}
  }

  const options = defaults({}, opts, { remote: !isNode })

  if (options.type === 'proc') {
    return new FactoryInProc(options)
  } else if (options.remote) {
    return new FactoryClient(options)
  } else {
    return new FactoryDaemon(options)
  }
}

exports.createServer = (options) => {
  if (typeof options === 'number') { // support .createServer(80)
    options = { port: options }
  }
  return new EndpointServer(options)
}
