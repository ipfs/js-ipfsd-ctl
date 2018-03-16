'use strict'

const hat = require('hat')
const boom = require('boom')
const Joi = require('joi')
const defaults = require('lodash.defaultsdeep')
const FactoryDaemon = require('../factory-daemon')
const tmpDir = require('../utils/tmp-dir')

const routeConfig = {
  validate: {
    query: {
      id: Joi.string().alphanum().required()
    }
  }
}

let nodes = {}

module.exports = (server) => {
  server.route({
    method: 'GET',
    path: '/util/tmp-dir',
    handler: (request, reply) => {
      const type = request.query.type || 'go'
      const path = tmpDir(type === 'js')

      reply({ tmpDir: path })
    }
  })

  server.route({
    method: 'GET',
    path: '/version',
    handler: (request, reply) => {
      const type = request.query.type || 'go'

      // TODO: use the ../src/index.js so that the right Factory is picked
      const f = new FactoryDaemon({ type: type })
      f.version((err, version) => {
        if (err) {
          return reply(boom.badRequest(err))
        }
        reply({ version: version })
      })
    }
  })

  /**
   * Spawn an IPFS node
   * The repo is created in a temporary location and cleaned up on process exit.
   **/
  server.route({
    method: 'POST',
    path: '/spawn',
    handler: (request, reply) => {
      const payload = request.payload || {}

      // TODO: use the ../src/index.js so that the right Factory is picked
      const f = new FactoryDaemon({ type: payload.type })

      f.spawn(payload.options, (err, ipfsd) => {
        if (err) {
          return reply(boom.badRequest(err))
        }
        const id = hat()
        const initialized = ipfsd.initialized
        nodes[id] = ipfsd

        let api = null

        if (nodes[id].started) {
          api = {
            apiAddr: nodes[id].apiAddr
              ? nodes[id].apiAddr.toString()
              : '',
            gatewayAddr: nodes[id].gatewayAddr
              ? nodes[id].gatewayAddr.toString()
              : ''
          }
        }

        reply({ id: id, api: api, initialized: initialized })
      })
    }
  })

  /**
   * Initialize a repo.
   **/
  server.route({
    method: 'POST',
    path: '/init',
    handler: (request, reply) => {
      const id = request.query.id

      const payload = request.payload || {}

      nodes[id].init(payload.initOpts, (err) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply({ initialized: nodes[id].initialized })
      })
    },
    config: routeConfig
  })

  /**
   * Start the daemon.
   **/
  server.route({
    method: 'POST',
    path: '/start',
    handler: (request, reply) => {
      const id = request.query.id

      const payload = request.payload || {}
      const flags = payload.flags || []

      nodes[id].start(flags, (err) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply({
          api: {
            apiAddr: nodes[id].apiAddr.toString(),
            gatewayAddr: nodes[id].gatewayAddr.toString()
          }
        })
      })
    },
    config: routeConfig
  })

  /**
   * Get the address of connected IPFS API.
   */
  server.route({
    method: 'GET',
    path: '/api-addr',
    handler: (request, reply) => {
      const id = request.query.id

      reply({ apiAddr: nodes[id].apiAddr.toString() })
    },
    config: routeConfig
  })

  /**
   * Get the address of connected IPFS HTTP Gateway.
   */
  server.route({
    method: 'GET',
    path: '/getaway-addr',
    handler: (request, reply) => {
      const id = request.query.id
      reply({ getawayAddr: nodes[id].gatewayAddr.toString() })
    },
    config: routeConfig
  })

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   **/
  server.route({
    method: 'POST',
    path: '/cleanup',
    handler: (request, reply) => {
      const id = request.query.id
      nodes[id].cleanup((err) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply().code(200)
      })
    },
    config: routeConfig
  })

  /**
   * Stop the daemon.
   */
  server.route({
    method: 'POST',
    path: '/stop',
    handler: (request, reply) => {
      const id = request.query.id
      nodes[id].stop((err) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply().code(200)
      })
    },
    config: routeConfig
  })

  /**
   * Kill the `ipfs daemon` process.
   *
   * First `SIGTERM` is sent, after 7.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   */
  server.route({
    method: 'POST',
    path: '/kill',
    handler: (request, reply) => {
      const id = request.query.id
      nodes[id].killProcess((err) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply().code(200)
      })
    },
    config: routeConfig
  })

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {number}
   */
  server.route({
    method: 'GET',
    path: '/pid',
    handler: (request, reply) => {
      const id = request.query.id

      reply({ pid: nodes[id].pid })
    },
    config: routeConfig
  })

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   */
  server.route({
    method: 'GET',
    path: '/config',
    handler: (request, reply) => {
      const id = request.query.id
      const key = request.query.key
      nodes[id].getConfig(key, (err, config) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply({ config: config })
      })
    },
    config: defaults({}, {
      validate: {
        query: {
          key: Joi.string().optional()
        }
      }
    }, routeConfig)
  })

  /**
   * Set a config value.
   */
  server.route({
    method: 'PUT',
    path: '/config',
    handler: (request, reply) => {
      const id = request.query.id
      const key = request.payload.key
      const val = request.payload.value

      nodes[id].setConfig(key, val, (err) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply().code(200)
      })
    },
    config: defaults({}, {
      validate: {
        payload: {
          key: Joi.string(),
          value: Joi.any()
        }
      }
    }, routeConfig)
  })
}
