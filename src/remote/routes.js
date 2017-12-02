'use strict'

const ipfsFactory = require('../local')
const guid = require('guid')
const boom = require('boom')
const utils = require('./utils')

const parseQuery = utils.parseQuery
const makeResponse = utils.makeResponse

let nodes = {}
module.exports = (server) => {
  /**
   * Spawn an IPFS node
   * The repo is created in a temporary location and cleaned up on process exit.
   **/
  server.route({
    method: 'GET',
    path: '/spawn',
    handler: (request, reply) => {
      const qr = parseQuery(request.query)
      const opts = qr.params.opts || {}
      ipfsFactory.spawn(opts, (err, ipfsd) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        const id = guid.raw()
        nodes[id] = ipfsd.ctrl

        let api = null
        if (nodes[id].started) {
          api = {
            apiAddr: nodes[id].apiAddr ? nodes[id].apiAddr.toString() : '',
            gatewayAddr: nodes[id].gatewayAddr ? nodes[id].gatewayAddr.toString() : ''
          }
        }
        reply(makeResponse(id, api))
      })
    }
  })

  /**
   * Get the address of connected IPFS API.
   *
   * @returns {Multiaddr}
   */
  server.route({
    method: 'GET',
    path: '/apiAddr',
    handler: (request, reply) => {
      const id = parseQuery(request.query).id
      reply(makeResponse(id, nodes[id].apiAddr()))
    }
  })

  /**
   * Get the address of connected IPFS HTTP Gateway.
   */
  server.route({
    method: 'GET',
    path: '/getawayAddr',
    handler: (request, reply) => {
      const id = parseQuery(request.query).id
      reply(makeResponse(id, nodes[id].getawayAddr()))
    }
  })

  /**
   * Initialize a repo.
   **/
  server.route({
    method: 'GET',
    path: '/init',
    handler: (request, reply) => {
      const qr = parseQuery(request.query)
      const id = qr.id
      const initOpts = qr.initOpts || {}
      nodes[id].init(initOpts, (err, node) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply(makeResponse(id, { initialized: node.initialized }))
      })
    }
  })

  /**
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   **/
  server.route({
    method: 'GET',
    path: '/shutdown',
    handler: (request, reply) => {
      const id = parseQuery(request.query).id
      nodes[id].shutdown((err, res) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply(makeResponse(id, res))
      })
    }
  })

  /**
   * Start the daemon.
   **/
  server.route({
    method: 'GET',
    path: '/startDaemon',
    handler: (request, reply) => {
      const qr = parseQuery(request.query)
      const id = qr.id
      const flags = Object.values(qr.params ? qr.params.flags : {})
      nodes[id].startDaemon(flags, (err) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply(makeResponse(id, {
          apiAddr: nodes[id].apiAddr.toString(),
          gatewayAddr: nodes[id].gatewayAddr.toString()
        }))
      })
    }
  })

  /**
   * Stop the daemon.
   */
  server.route({
    method: 'GET',
    path: '/stopDaemon',
    handler: (request, reply) => {
      const id = parseQuery(request.query).id
      nodes[id].stopDaemon((err, res) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply(makeResponse(id, res))
      })
    }
  })

  /**
   * Kill the `ipfs daemon` process.
   *
   * First `SIGTERM` is sent, after 7.5 seconds `SIGKILL` is sent
   * if the process hasn't exited yet.
   */
  server.route({
    method: 'GET',
    path: '/killProcess',
    handler: (request, reply) => {
      const id = parseQuery(request.query).id
      nodes[id].killProcess((err, res) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply(makeResponse(id, res))
      })
    }
  })

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {number}
   */
  server.route({
    method: 'GET',
    path: '/daemonPid',
    handler: (request, reply) => {
      const id = parseQuery(request.query).id
      reply(makeResponse(id, nodes[id].daemonPid(nodes[id])))
    }
  })

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   */
  server.route({
    method: 'GET',
    path: '/getConfig',
    handler: (request, reply) => {
      const qr = parseQuery(request.query)
      const id = qr.id
      const key = qr.params ? qr.params.key : null
      nodes[id].getConfig(key, (err, res) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply(makeResponse(id, res))
      })
    }
  })

  /**
   * Set a config value.
   */
  server.route({
    method: 'GET',
    path: '/setConfig',
    handler: (request, reply) => {
      const qr = parseQuery(request.query)
      const id = qr.id
      const key = qr.params ? qr.params.key : undefined
      const val = qr.params ? qr.params.value : undefined
      nodes[id].setConfig(key, val, (err, res) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply(makeResponse(id, res))
      })
    }
  })

  /**
   * Replace the configuration with a given file
   **/
  server.route({
    method: 'GET',
    path: '/replaceConf',
    handler: (request, reply) => {
      const id = parseQuery(request.query).id
      nodes[id].replaceConf((err, res) => {
        if (err) {
          return reply(boom.badRequest(err))
        }

        reply(null, makeResponse(id, res))
      })
    }
  })
}
