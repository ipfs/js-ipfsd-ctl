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
   * @param {number} [options.port=43134]
   * @param {string} [options.host='localhost']
   * @param {Function} createFactory
   */
  constructor (options = { port: 43134, host: 'localhost' }, createFactory) {
    this.options = options
    this.server = null
    this.port = this.options.port == null ? 43134 : this.options.port
    this.host = this.options.host == null ? 'localhost' : this.options.host
    this.createFactory = createFactory
  }

  /**
   * Start the server
   *
   * @param {number} port
   * @returns {Promise<Server>}
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

    return this
  }

  /**
   * Stop the server
   *
   * @param {object} [options]
   * @param {number} options.timeout
   * @returns {Promise<void>}
   */
  async stop (options) {
    if (this.server) {
      await this.server.stop(options)
    }
  }
}

module.exports = Server
