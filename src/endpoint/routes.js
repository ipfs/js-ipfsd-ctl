'use strict'

const { nanoid } = require('nanoid')
const Joi = require('joi')
const boom = require('@hapi/boom')
const debug = require('debug')('ipfsd-ctl:routes')
const { tmpDir } = require('../utils')

const routeOptions = {
  validate: {
    query: Joi.object({
      id: Joi.string().required()
    })
  }
}
const badRequest = err => {
  let msg
  if (err.stdout) {
    msg = err.stdout + ' - ' + err.message
  } else {
    msg = err.message
  }
  debug(err)
  throw boom.badRequest(msg)
}

const nodes = {}

/**
 * @namespace EndpointServerRoutes
 * @ignore
 * @param {Hapi.Server} server
 * @param {Function} createFactory
 * @returns {void}
 */
module.exports = (server, createFactory) => {
  server.route({
    method: 'GET',
    path: '/util/tmp-dir',
    handler: async (request) => {
      const type = request.query.type || 'go'
      try {
        return { tmpDir: await tmpDir(type) }
      } catch (err) {
        badRequest(err)
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/version',
    handler: async (request) => {
      const id = request.query.id

      try {
        return { version: await nodes[id].version() }
      } catch (err) {
        badRequest(err)
      }
    },
    options: routeOptions
  })

  server.route({
    method: 'POST',
    path: '/spawn',
    handler: async (request) => {
      const opts = request.payload || {}
      try {
        const ipfsd = createFactory()
        const id = nanoid()
        nodes[id] = await ipfsd.spawn(opts)
        return {
          id: id,
          apiAddr: nodes[id].apiAddr ? nodes[id].apiAddr.toString() : '',
          gatewayAddr: nodes[id].gatewayAddr ? nodes[id].gatewayAddr.toString() : '',
          grpcAddr: nodes[id].grpcAddr ? nodes[id].grpcAddr.toString() : '',
          initialized: nodes[id].initialized,
          started: nodes[id].started,
          disposable: nodes[id].disposable,
          env: nodes[id].env,
          path: nodes[id].path,
          clean: nodes[id].clean
        }
      } catch (err) {
        badRequest(err)
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
        await nodes[id].init(payload)

        return {
          initialized: nodes[id].initialized
        }
      } catch (err) {
        badRequest(err)
      }
    },
    options: routeOptions
  })

  /*
   * Start the daemon.
   */
  server.route({
    method: 'POST',
    path: '/start',
    handler: async (request) => {
      const id = request.query.id

      try {
        await nodes[id].start()

        return {
          apiAddr: nodes[id].apiAddr ? nodes[id].apiAddr.toString() : '',
          gatewayAddr: nodes[id].gatewayAddr ? nodes[id].gatewayAddr.toString() : '',
          grpcAddr: nodes[id].grpcAddr ? nodes[id].grpcAddr.toString() : ''
        }
      } catch (err) {
        badRequest(err)
      }
    },
    options: routeOptions
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
        badRequest(err)
      }
    },
    options: routeOptions
  })

  /*
   * Stop the daemon.
   */
  server.route({
    method: 'POST',
    path: '/stop',
    handler: async (request, h) => {
      const id = request.query.id

      try {
        await nodes[id].stop()

        return h.response().code(200)
      } catch (err) {
        badRequest(err)
      }
    },
    options: routeOptions
  })

  /*
   * Get the pid of the `ipfs daemon` process.
   */
  server.route({
    method: 'GET',
    path: '/pid',
    handler: async (request) => {
      const id = request.query.id

      return { pid: await nodes[id].pid() }
    },
    options: routeOptions
  })
}
