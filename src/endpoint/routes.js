'use strict'

const hat = require('hat')
const Joi = require('@hapi/joi')
const boom = require('@hapi/boom')
const merge = require('merge-options')
const FactoryDaemon = require('../factory-daemon')
const tmpDir = require('../utils/tmp-dir')

const routeConfig = {
  validate: {
    query: {
      id: Joi.string().alphanum().required()
    }
  }
}

const nodes = {}

/**
 * @namespace EndpointServerRoutes
 * @ignore
 * @param {Hapi.Server} server
 * @returns {void}
 */
module.exports = (server) => {
  server.route({
    method: 'GET',
    path: '/util/tmp-dir',
    handler: async (request) => {
      const type = request.query.type || 'go'
      try {
        return { tmpDir: await tmpDir(type === 'js') }
      } catch (err) {
        throw boom.badRequest(err.message)
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/version',
    handler: async (request) => {
      const type = request.query.type || 'go'

      // TODO: use the ../src/index.js so that the right Factory is picked
      const f = new FactoryDaemon({ type: type })

      try {
        return {
          version: await f.version()
        }
      } catch (err) {
        throw boom.badRequest(err.message)
      }
    }
  })

  /*
   * Spawn an IPFS node
   * The repo is created in a temporary location and cleaned up on process exit.
   */
  server.route({
    method: 'POST',
    path: '/spawn',
    handler: async (request) => {
      const payload = request.payload || {}

      // TODO: use the ../src/index.js so that the right Factory is picked
      const f = new FactoryDaemon({ type: payload.type })

      try {
        const ipfsd = await f.spawn(payload)
        const id = hat()
        nodes[id] = ipfsd

        return {
          _id: id,
          apiAddr: ipfsd.apiAddr ? ipfsd.apiAddr.toString() : '',
          gatewayAddr: ipfsd.gatewayAddr ? ipfsd.gatewayAddr.toString() : '',
          initialized: ipfsd.initialized,
          started: ipfsd.started,
          _env: ipfsd._env,
          path: ipfsd.path
        }
      } catch (err) {
        throw boom.badRequest(err.message)
      }
    }
  })

  /*
   * Initialize a repo.
   */
  server.route({
    method: 'POST',
    path: '/init',
    handler: async (request) => {
      const id = request.query.id
      const payload = request.payload || {}

      try {
        await nodes[id].init(payload.initOpts)

        return {
          initialized: nodes[id].initialized
        }
      } catch (err) {
        throw boom.badRequest(err.message)
      }
    },
    config: routeConfig
  })

  /*
   * Start the daemon.
   */
  server.route({
    method: 'POST',
    path: '/start',
    handler: async (request) => {
      const id = request.query.id
      const payload = request.payload || {}
      const flags = payload.flags || []

      try {
        await nodes[id].start(flags)

        return {
          apiAddr: nodes[id].apiAddr.toString(),
          gatewayAddr: nodes[id].gatewayAddr ? nodes[id].gatewayAddr.toString() : ''
        }
      } catch (err) {
        throw boom.badRequest(err.message)
      }
    },
    config: routeConfig
  })

  /*
   * Get the address of connected IPFS API.
   */
  server.route({
    method: 'GET',
    path: '/api-addr',
    handler: (request) => {
      const id = request.query.id

      return { apiAddr: nodes[id].apiAddr.toString() }
    },
    config: routeConfig
  })

  /*
   * Get the address of connected IPFS HTTP Gateway.
   * @memberof EndpointServerRoutes
   */
  server.route({
    method: 'GET',
    path: '/getaway-addr',
    handler: (request) => {
      const id = request.query.id

      return { getawayAddr: nodes[id].gatewayAddr.toString() }
    },
    config: routeConfig
  })

  /*
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   */
  server.route({
    method: 'POST',
    path: '/cleanup',
    handler: async (request, h) => {
      const id = request.query.id

      try {
        await nodes[id].cleanup()

        return h.response().code(200)
      } catch (err) {
        throw boom.badRequest(err.message)
      }
    },
    config: routeConfig
  })

  /*
   * Stop the daemon.
   */
  server.route({
    method: 'POST',
    path: '/stop',
    handler: async (request, h) => {
      const id = request.query.id
      const timeout = request.payload && request.payload.timeout

      try {
        await nodes[id].stop(timeout)

        return h.response().code(200)
      } catch (err) {
        throw boom.badRequest(err.message)
      }
    },
    config: routeConfig
  })

  /*
   * Kill the `ipfs daemon` process.
   *
   * First `SIGTERM` is sent, after 7.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   */
  server.route({
    method: 'POST',
    path: '/kill',
    handler: async (request, h) => {
      const id = request.query.id
      const timeout = request.payload && request.payload.timeout

      try {
        await nodes[id].killProcess(timeout)

        return h.response().code(200)
      } catch (err) {
        throw boom.badRequest(err.message)
      }
    },
    config: routeConfig
  })

  /*
   * Get the pid of the `ipfs daemon` process.
   */
  server.route({
    method: 'GET',
    path: '/pid',
    handler: (request) => {
      const id = request.query.id

      return { pid: nodes[id].pid }
    },
    config: routeConfig
  })

  /*
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   */
  server.route({
    method: 'GET',
    path: '/config',
    handler: async (request) => {
      const id = request.query.id
      const key = request.query.key

      try {
        const config = await nodes[id].getConfig(key)

        return { config: config }
      } catch (err) {
        throw boom.badRequest(err.message)
      }
    },
    config: merge(routeConfig, {
      validate: {
        query: {
          key: Joi.string().optional()
        }
      }
    })
  })

  /*
   * Set a config value.
   */
  server.route({
    method: 'PUT',
    path: '/config',
    handler: async (request, h) => {
      const id = request.query.id
      const key = request.payload.key
      const val = request.payload.value

      try {
        await nodes[id].setConfig(key, val)
      } catch (err) {
        throw boom.badRequest(err.message)
      }

      return h.response().code(200)
    },
    config: merge(routeConfig, {
      validate: {
        payload: {
          key: Joi.string(),
          value: Joi.any()
        }
      }
    })
  })
}
