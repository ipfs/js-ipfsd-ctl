'use strict'

const isNode = require('detect-node')
const defaults = require('lodash.defaultsdeep')

const EndpointServer = require('./endpoint/server')
const FactoryDaemon = require('./factory-daemon')
const FactoryInProc = require('./factory-in-proc')
const FactoryClient = require('./factory-client')

/** @namespace IPFSFactory */

/**
 * Create a Factory
 *
 * @memberof IPFSFactory
 * @static
 * @param {Object} [opts={}]
 * @param {boolean} [opts.remote] - Use remote endpoint to spawn the nodes. Defaults to `true` when not in node.
 * @param {number} [opts.port=43134] - Remote endpoint port.
 * @param {string} [opts.exec] - IPFS executable path. ipfsd-ctl will attempt to locate it by default. If you desire to spawn js-ipfs instances in the same process, pass the reference to the module instead (e.g exec: `require('ipfs')`)
 * @param {string} [opts.type] - The daemon type, see below the options:
 * - go - spawn go-ipfs daemon
 * - js - spawn js-ipfs daemon
 * - proc - spawn in-process js-ipfs instance. Needs to be called also with exec. Example: `IPFSFactory.create({type: 'proc', exec: require('ipfs') })`.
 * @returns {(FactoryDaemon|FactoryClient|FactoryInProc)}
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
 * @memberof IPFSFactory
 * @static
 * @param {(Object|number)} options - Configuration options or just the port.
 * @param {number} options.port - Port to start the server on.
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
