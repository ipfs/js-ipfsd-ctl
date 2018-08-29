'use strict'

const Hapi = require('hapi')
const routes = require('./routes')

/**
 * Creates an instance of Server.
 * @param {Object} options
 * @param {number} [options.port=43134] - server port
 */
class EndpointServer {
  constructor (options) {
    options = options || { port: 43134 }

    this.server = null
    this.port = options.port
  }

  /**
   * Start the server
   *
   * @param {*} cb
   */
  start (cb) {
    cb = cb || (() => {})

    this.server = new Hapi.Server()

    this.server.connection({
      port: this.port,
      host: 'localhost',
      routes: {
        cors: true
      }
    })

    routes(this.server)

    this.server.start((err) => {
      if (err) {
        return cb(err)
      }

      cb(null, this.server)
    })
  }

  /**
   * Stop the server
   *
   * @param {*} cb
   */
  stop (cb) {
    cb = cb || (() => {})

    this.server.stop(cb)
  }
}

module.exports = EndpointServer
