'use strict'

const Factory = require('./factory')
const Server = require('./endpoint/server')

/**
 * @typedef {import("./types").Controller} Controller
 * @typedef {import("./types").ControllerOptions} ControllerOptions
 * @typedef {import("./types").ControllerOptionsOverrides} ControllerOptionsOverrides
 */

/**
 * Creates a factory
 *
 * @param {ControllerOptions} [options]
 * @param {ControllerOptionsOverrides} [overrides]
 * @returns {Factory}
 */
const createFactory = (options, overrides) => {
  return new Factory(options, overrides)
}

/**
 * Creates a node
 *
 * @param {ControllerOptions} [options]
 * @returns {Promise<Controller>}
 */
const createController = (options) => {
  const f = new Factory()
  return f.spawn(options)
}

/**
 * Create a Endpoint Server
 *
 * @param {number | { port: number }} [options] - Configuration options or just the port.
 * @param {ControllerOptions} [factoryOptions]
 * @param {ControllerOptionsOverrides} [factoryOverrides]
 */
const createServer = (options, factoryOptions = {}, factoryOverrides = {}) => {
  if (typeof options === 'number') {
    options = { port: options }
  }

  return new Server(options, () => {
    return createFactory(factoryOptions, factoryOverrides)
  })
}

module.exports = {
  createFactory,
  createController,
  createServer
}
