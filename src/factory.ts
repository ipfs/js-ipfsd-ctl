import mergeOptions from 'merge-options'
import { tmpDir } from './utils.js'
import { isNode, isElectronMain } from 'wherearewe'
import http from 'ipfs-utils/src/http.js'
import ControllerDaemon from './ipfsd-daemon.js'
import ControllerRemote from './ipfsd-client.js'
import ControllerProc from './ipfsd-in-proc.js'
import testsConfig from './config.js'
import type { Controller, ControllerOptions, ControllerOptionsOverrides, ControllerOptions_RemoteEnabled, IPFSOptions, NodeType } from './types'
// import type ControllerBase from './controller-base'

const merge = mergeOptions.bind({ ignoreUndefined: true })

const defaults: Partial<ControllerOptions<NodeType>> = {
  remote: !isNode && !isElectronMain,
  disposable: true,
  test: false,
  type: 'go',
  env: {},
  args: [],
  ipfsOptions: {},
  forceKill: true,
  forceKillTimeout: 5000
}

if (defaults.remote === true) {
  defaults.endpoint = process.env.IPFSD_CTL_SERVER ?? 'http://localhost:43134'
}

/**
 * Factory class to spawn ipfsd controllers
 */
class Factory<T extends NodeType = NodeType> {
  opts: ControllerOptions<T>
  overrides: ControllerOptionsOverrides
  controllers: Array<Controller<T>>

  constructor (options: ControllerOptions<T> = {}, overrides: ControllerOptionsOverrides = {}) {
    this.opts = merge(defaults, options)

    this.overrides = merge({
      js: merge(this.opts, { type: 'js' }),
      go: merge(this.opts, { type: 'go' }),
      proc: merge(this.opts, { type: 'proc' })
    }, overrides)

    this.controllers = []
  }

  /**
   * Utility method to get a temporary directory
   * useful in browsers to be able to generate temp
   * repos manually
   */
  async tmpDir (options: ControllerOptions<T> = {}): Promise<string> {
    const opts: ControllerOptions<T> = merge(this.opts, options)

    if (opts.remote === true) {
      const res = await http.get(
          `${opts.endpoint}/util/tmp-dir`,
          { searchParams: new URLSearchParams({ type: opts.type as string }) }
      )
      const out = await res.json()

      return out.tmpDir
    }

    return await Promise.resolve(tmpDir(opts.type))
  }

  async _spawnRemote <T extends NodeType>(options: IPFSOptions & ControllerOptions & ControllerOptions_RemoteEnabled & { type: T }): Promise<Controller<T>> {
    const opts = {
      json: {
        ...options,
        // avoid recursive spawning
        remote: false,
        ipfsBin: undefined,
        ipfsModule: undefined,
        ipfsHttpModule: undefined,
        kuboRpcModule: undefined
      }
    }

    const res = await http.post(
      `${options.endpoint}/spawn`,
      opts
    )
    return new ControllerRemote(
      options.endpoint,
      await res.json(),
      options
    )
  }

  /**
   * Spawn an IPFSd Controller
   */
  async spawn <SpawnType extends T>(options: ControllerOptions<SpawnType> & { type: SpawnType }): Promise<Controller<SpawnType>> {
    const type = options?.type ?? this.opts.type ?? 'go'
    options = { ...options, type }
    const opts: ControllerOptions<SpawnType> & { type: SpawnType } = merge(
      this.overrides[type],
      options ?? { type }
    )

    // IPFS options defaults
    const ipfsOptions = merge(
      {
        start: false,
        init: false
      },
      opts.test === true
        ? {
            config: testsConfig({ type }),
            preload: { enabled: false }
          }
        : {},
      opts.ipfsOptions
    )

    // let ctl: Controller<'proc'> | Controller<'go'> | Controller<'js'>
    let ctl: Controller<typeof type>
    if (type === 'proc') {
      // spawn in-proc controller
      ctl = new ControllerProc({ ...opts, ipfsOptions })
    } else if (opts.remote === true) {
      // spawn remote controller
      ctl = await this._spawnRemote<typeof type>({ ...opts, ipfsOptions })
    } else {
      // spawn daemon controller
      ctl = new ControllerDaemon({ ...opts, ipfsOptions })
    }

    // Save the controller
    this.controllers.push(ctl)

    // Auto init and start controller
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (opts.disposable && (!options.ipfsOptions || (options.ipfsOptions && options.ipfsOptions.init !== false))) {
      await ctl.init(ipfsOptions.init)
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (opts.disposable && (!options.ipfsOptions || (options.ipfsOptions && options.ipfsOptions.start !== false))) {
      await ctl.start()
    }

    return ctl
  }

  /**
   * Stop all controllers
   */
  async clean () {
    await Promise.all(this.controllers.map(async n => await n.stop()))
    this.controllers = []
  }
}

export default Factory
