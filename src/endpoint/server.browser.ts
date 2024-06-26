/* eslint-disable no-console */

import type { ServerInit } from './server.js'

/**
 * Creates an instance of Server
 */
class Server {
  private readonly options: ServerInit
  public port: number
  public host: string

  constructor (options: ServerInit = { port: 43134, host: 'localhost' }) {
    this.options = options
    this.port = this.options.port ?? 43134
    this.host = this.options.host ?? 'localhost'

    console.warn('Server not implemented in the browser')
  }

  /**
   * Start the server
   */
  async start (): Promise<Server> {
    console.warn('Server not implemented in the browser')

    return this
  }

  /**
   * Stop the server
   */
  async stop (): Promise<void> {
    console.warn('Server not implemented in the browser')
  }
}

export default Server
