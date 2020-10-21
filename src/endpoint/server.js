'use strict'

const Hapi = require('@hapi/hapi')
const routes = require('./routes')

/**
 * Creates an instance of Server.
 *
 * @class
 */
class Server {
  /**
   * @class
   * @param {Object} options
   * @param {number} [options.port=43134] - Server port.
   * @param {Function} createFactory
   */
  constructor (options = { port: 43134, host: 'localhost' }, createFactory) {
    this.options = options
    this.server = null
    this.port = this.options.port
    this.host = this.options.host
    this.createFactory = createFactory
  }

  /**
   * Start the server
   *
   * @param {number} port
   * @returns {Promise<Hapi.Server>}
   */
  async start (port = this.port) {
    this.port = port
    this.server = new Hapi.Server({
      port: port,
      host: this.host,
      routes: {
        cors: true
      }
    })

    routes(this.server, this.createFactory)

    await this.server.start()
    return this.server
  }

  /**
   * Stop the server
   *
   * @param {object} [options] - {@link https://hapi.dev/api/?v=18.4.0#-await-serverstopoptions Hapi docs}
   * @returns {Promise}
   */
  stop (options) {
    return this.server.stop(options)
  }
}

module.exports = Server
