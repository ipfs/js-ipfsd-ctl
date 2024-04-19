import mergeOptions from 'merge-options'
import { isNode, isElectronMain } from 'wherearewe'
import KuboClient from './kubo/client.js'
import KuboDaemon from './kubo/daemon.js'
import type { Controller, ControllerOptions, ControllerOptionsOverrides, ControllerType, Factory, KuboController, KuboOptions, SpawnOptions } from './index.js'

const merge = mergeOptions.bind({ ignoreUndefined: true })

const defaults = {
  remote: !isNode && !isElectronMain,
  disposable: true,
  test: false,
  type: 'kubo',
  env: {},
  args: [],
  forceKill: true,
  forceKillTimeout: 5000
}

export interface FactoryInit extends ControllerOptions {
  /**
   * Endpoint URL to manage remote Controllers. (Defaults: 'http://127.0.0.1:43134')
   */
  endpoint?: string
}

/**
 * Factory class to spawn ipfsd controllers
 */
class DefaultFactory implements Factory<any> {
  public options: ControllerOptions
  public controllers: Controller[]
  public readonly overrides: ControllerOptionsOverrides

  private readonly endpoint: string

  constructor (options: FactoryInit = {}, overrides: ControllerOptionsOverrides = {}) {
    this.endpoint = options.endpoint ?? process.env.IPFSD_CTL_SERVER ?? 'http://localhost:43134'
    this.options = merge(defaults, options)
    this.overrides = merge({
      kubo: this.options
    }, overrides)

    this.controllers = []
  }

  /**
   * Spawn an IPFSd Controller
   */
  async spawn (options?: KuboOptions & SpawnOptions): Promise<KuboController>
  async spawn (options?: ControllerOptions & SpawnOptions): Promise<Controller> {
    const type: ControllerType = options?.type ?? this.options.type ?? 'kubo'
    const opts = merge({}, this.options, this.overrides[type], options)
    let ctl: any

    if (type === 'kubo') {
      if (opts.remote === true) {
        const req = await fetch(`${this.endpoint}/spawn`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            ...opts,
            remote: false
          })
        })
        const result = await req.json()

        ctl = new KuboClient({
          endpoint: this.endpoint,
          ...opts,
          ...result
        })
      } else {
        ctl = new KuboDaemon(opts)
      }
    }

    if (ctl == null) {
      throw new Error('Unsupported type')
    }

    // Save the controller
    this.controllers.push(ctl)

    // Auto start controller
    if (opts.init !== false) {
      await ctl.init(opts.init)
    }

    // Auto start controller
    if (opts.start !== false) {
      await ctl.start(opts.start)
    }

    return ctl
  }

  /**
   * Stop all controllers
   */
  async clean (): Promise<void> {
    await Promise.all(
      this.controllers.map(async n => n.stop())
    )

    this.controllers = []
  }
}

export default DefaultFactory
