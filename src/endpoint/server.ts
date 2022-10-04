import Hapi from '@hapi/hapi'
import type { CreateFactory } from '../index.js'
import routes from './routes.js'

export interface ServerInit {
  port?: number
  host?: string
}

/**
 * Creates an instance of Server
 */
class Server {
  private readonly options: ServerInit
  private server: Hapi.Server | null
  public port: number
  public host: string
  private readonly createFactory: CreateFactory

  constructor (options: ServerInit = { port: 43134, host: 'localhost' }, createFactory: CreateFactory) {
    this.options = options
    this.server = null
    this.port = this.options.port ?? 43134
    this.host = this.options.host ?? 'localhost'
    this.createFactory = createFactory
  }

  /**
   * Start the server
   */
  async start (port = this.port): Promise<Server> {
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
   */
  async stop (options: { timeout: number }): Promise<void> {
    if (this.server != null) {
      await this.server.stop(options)
    }
  }
}

export default Server
