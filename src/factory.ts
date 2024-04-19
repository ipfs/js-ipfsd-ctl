import mergeOptions from 'merge-options'
import { isNode, isElectronMain } from 'wherearewe'
import KuboClient from './kubo/client.js'
import KuboDaemon from './kubo/daemon.js'
import type { Node, NodeOptions, NodeOptionsOverrides, NodeType, Factory, KuboNode, KuboOptions, SpawnOptions } from './index.js'

const merge = mergeOptions.bind({ ignoreUndefined: true })

const defaults = {
  endpoint: process.env.IPFSD_CTL_SERVER ?? 'http://localhost:43134',
  remote: !isNode && !isElectronMain,
  disposable: true,
  test: false,
  type: 'kubo',
  env: {},
  args: [],
  forceKill: true,
  forceKillTimeout: 5000
}

/**
 * Factory class to spawn ipfsd controllers
 */
class DefaultFactory implements Factory<any> {
  public options: NodeOptions
  public controllers: Node[]
  public readonly overrides: NodeOptionsOverrides

  constructor (options: NodeOptions = {}, overrides: NodeOptionsOverrides = {}) {
    this.options = merge({}, defaults, options)
    this.overrides = merge({
      kubo: this.options
    }, overrides)

    this.controllers = []
  }

  /**
   * Spawn an IPFSd Node
   */
  async spawn (options?: KuboOptions & SpawnOptions): Promise<KuboNode>
  async spawn (options?: NodeOptions & SpawnOptions): Promise<Node> {
    const type: NodeType = options?.type ?? this.options.type ?? 'kubo'
    const opts = merge({}, this.options, this.overrides[type], options)
    let ctl: any

    if (type === 'kubo') {
      if (opts.remote === true) {
        const req = await fetch(`${opts.endpoint}/spawn`, {
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
