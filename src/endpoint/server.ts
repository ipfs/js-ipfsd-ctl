import Hapi from '@hapi/hapi'
import routes from './routes.js'
import type { Node, Factory } from '../index.js'

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
  private readonly ipfsd: Factory
  public readonly nodes: Record<string, Node>

  constructor (options: ServerInit = { port: 43134, host: 'localhost' }, factory: Factory) {
    this.options = options
    this.server = null
    this.port = this.options.port ?? 43134
    this.host = this.options.host ?? 'localhost'
    this.ipfsd = factory
    this.nodes = {}
  }

  /**
   * Start the server
   */
  async start (port = this.port): Promise<Server> {
    this.port = port
    this.server = new Hapi.Server({
      port,
      host: this.host,
      routes: {
        cors: true
      }
    })

    routes(this.server, this.ipfsd, this.nodes)

    await this.server.start()

    return this
  }

  /**
   * Stop the server
   */
  async stop (options?: { timeout: number }): Promise<void> {
    if (this.server != null) {
      this.server.listener.closeAllConnections()
      await this.server.stop(options)
    }

    await this.clean()
  }

  /**
   * Stop any nodes created by this server
   */
  async clean (): Promise<void> {
    await this.ipfsd.clean()

    // remove references to nodes
    for (const key of Object.getOwnPropertyNames(this.nodes)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.nodes[key]
    }
  }
}

export default Server
