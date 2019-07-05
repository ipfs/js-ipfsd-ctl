'use strict'

const Hapi = require('@hapi/hapi')
const routes = require('./routes')

/**
 * Creates an instance of Server.
 * @param {Object} options
 * @param {number} [options.port=43134] - Server port.
 */
class Server {
  constructor (options) {
    options = options || { port: 43134 }

    this.server = null
    this.port = options.port
  }

  /**
   * Start the server
   *
   * @param {function(Error, Hapi.Server): void} cb
   * @returns {void}
   */
  async start () {
    this.server = new Hapi.Server({
      port: this.port,
      host: 'localhost',
      routes: {
        cors: true
      }
    })

    routes(this.server)

    await this.server.start()

    return this.server
  }

  /**
   * Stop the server
   *
   * @param {function(err: Error)} [cb] - {@link https://github.com/hapijs/hapi/blob/v16.6.2/API.md#serverstopoptions-callback Hapi docs}
   * @returns {void}
   */
  stop () {
    return this.server.stop()
  }
}

module.exports = Server
