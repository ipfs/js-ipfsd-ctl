/* eslint-disable no-console */
'use strict'

/**
 * Creates an instance of Server.
 * @class
 */
class Server {
  /**
   * @constructor
   * @param {Object} options
   * @param {number} [options.port=43134] - Server port.
   * @param {function} createNode
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
   * @param {object} [options] - {@link https://hapi.dev/api/?v=18.4.0#-await-serverstopoptions Hapi docs}
   * @returns {Promise}
   */
  stop () {
    console.warn('Server not implemented in the browser')
    return Promise.resolve(this)
  }
}

module.exports = Server
