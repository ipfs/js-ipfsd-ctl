'use strict'

const ipfsFactory = require('../local')
const hat = require('hat')
const boom = require('boom')
const Joi = require('joi')
const defaults = require('lodash.defaultsdeep')

const config = {
  validate: {
    query: {
      id: Joi.string().alphanum().required()
    }
  }
}

let nodes = {}
module.exports = (server) => {
  /**
   * Spawn an IPFS node
   * The repo is created in a temporary location and cleaned up on process exit.
   **/
  server.route({
    method: 'POST',
    path: '/spawn',
    handler: (request, reply) => {
      const payload = request.payload || {}
      ipfsFactory.spawn(payload.opts, (err, ipfsd) => {
        if (err) {
          return reply(boom.internal(err))
        }

        const id = hat()
        nodes[id] = ipfsd.ctrl

        let api = null
        if (nodes[id].started) {
          api = {
            apiAddr: nodes[id].apiAddr ? nodes[id].apiAddr.toString() : '',
            gatewayAddr: nodes[id].gatewayAddr ? nodes[id].gatewayAddr.toString() : ''
          }
        }
        reply({ id, api })
      })
    }
  })

  /**
   * Get the address of connected IPFS API.
   */
  server.route({
    method: 'GET',
    path: '/api-addr',
    handler: (request, reply) => {
      const id = request.query.id
      reply({ apiAddr: nodes[id].apiAddr() })
    },
    config
  })

  /**
   * Get the address of connected IPFS HTTP Gateway.
   */
  server.route({
    method: 'GET',
    path: '/getaway-addr',
    handler: (request, reply) => {
      const id = request.query.id
      reply({ getawayAddr: nodes[id].getawayAddr() })
    },
    config
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
      nodes[id].init(payload.initOpts, (err, node) => {
        if (err) {
          return reply(boom.internal(err))
        }

        reply({ initialized: node.initialized })
      })
    },
    config
  })

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   **/
  server.route({
    method: 'POST',
    path: '/shutdown',
    handler: (request, reply) => {
      const id = request.query.id
      nodes[id].shutdown((err) => {
        if (err) {
          return reply(boom.internal(err))
        }

        reply().code(200)
      })
    },
    config
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
      nodes[id].startDaemon(flags, (err) => {
        if (err) {
          return reply(boom.internal(err))
        }

        reply({
          api: {
            apiAddr: nodes[id].apiAddr.toString(),
            gatewayAddr: nodes[id].gatewayAddr.toString()
          }
        })
      })
    },
    config
  })

  /**
   * Stop the daemon.
   */
  server.route({
    method: 'POST',
    path: '/stop',
    handler: (request, reply) => {
      const id = request.query.id
      nodes[id].stopDaemon((err) => {
        if (err) {
          return reply(boom.internal(err))
        }

        reply().code(200)
      })
    },
    config
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
          return reply(boom.internal(err))
        }

        reply().code(200)
      })
    },
    config
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
      reply({ pid: nodes[id].daemonPid(nodes[id]) })
    },
    config
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
          return reply(boom.internal(err))
        }

        reply({ config })
      })
    },
    config: defaults({}, {
      validate: {
        query: {
          key: Joi.string().optional()
        }
      }
    }, config)
  })

  /**
   * Set a config value.
   */
  server.route({
    method: 'PUT',
    path: '/config',
    handler: (request, reply) => {
      const id = request.query.id
      const replace = request.query.replace
      const key = request.payload.key
      const val = request.payload.value

      if (replace) {
        return nodes[id].replaceConf((err) => {
          if (err) {
            return reply(boom.internal(err))
          }

          reply().code(200)
        })
      }

      nodes[id].setConfig(key, val, (err) => {
        if (err) {
          return reply(boom.internal(err))
        }

        reply().code(200)
      })
    },
    config: defaults({}, {
      validate: {
        query: {
          replace: Joi.boolean().optional()
        }
      }
    }, config)
  })
}
