/* eslint-disable no-console */
'use strict'

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
   * @param {Function} createNode
   */
  constructor (options, createNode) {
    options = options || { port: 43134 }

    this.server = null
    this.port = options.port
    this.createNode = createNode
    console.warn('Server not implemented in the browser')
  }

  /**
   * Start the server
   *
   * @returns {Promise<Hapi.Server>}
   */
  start () {
    console.warn('Server not implemented in the browser')
    return Promise.resolve(this)
  }

  /**
   * Stop the server
   *
   * @returns {Promise}
   */
  stop () {
    console.warn('Server not implemented in the browser')
    return Promise.resolve(this)
  }
}

module.exports = Server
