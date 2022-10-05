import mergeOptions from 'merge-options'
import { tmpDir } from './utils.js'
import { isNode, isElectronMain } from 'wherearewe'
import http from 'ipfs-utils/src/http.js'
import ControllerDaemon from './ipfsd-daemon.js'
import ControllerRemote from './ipfsd-client.js'
import ControllerProc from './ipfsd-in-proc.js'
import testsConfig from './config.js'
import type { Controller, ControllerOptions, ControllerOptionsOverrides, Factory } from './index.js'

const merge = mergeOptions.bind({ ignoreUndefined: true })

const defaults = {
  remote: !isNode && !isElectronMain,
  endpoint: process.env.IPFSD_CTL_SERVER ?? 'http://localhost:43134',
  disposable: true,
  test: false,
  type: 'go',
  env: {},
  args: [],
  ipfsOptions: {},
  forceKill: true,
  forceKillTimeout: 5000
}

export interface ControllerOptionsOverridesWithEndpoint {
  js?: ControllerOptionsWithEndpoint
  go?: ControllerOptionsWithEndpoint
  proc?: ControllerOptionsWithEndpoint
}

export interface ControllerOptionsWithEndpoint extends ControllerOptions {
  endpoint: string
}

/**
 * Factory class to spawn ipfsd controllers
 */
class DefaultFactory implements Factory {
  public opts: ControllerOptionsWithEndpoint
  public controllers: Controller[]

  private readonly overrides: ControllerOptionsOverridesWithEndpoint

  constructor (options: ControllerOptions = {}, overrides: ControllerOptionsOverrides = {}) {
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
  async tmpDir (options: ControllerOptions = {}): Promise<string> {
    const opts: ControllerOptions = merge(this.opts, options)

    if (opts.remote === true) {
      const res = await http.get(
        `${opts.endpoint ?? ''}/util/tmp-dir`,
        { searchParams: new URLSearchParams({ type: opts.type ?? '' }) }
      )
      const out = await res.json()

      return out.tmpDir
    }

    return await Promise.resolve(tmpDir(opts.type))
  }

  async _spawnRemote (options: ControllerOptionsWithEndpoint) {
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
  async spawn (options: ControllerOptions = { }): Promise<Controller> {
    const type = options.type ?? this.opts.type ?? 'go'
    const opts: ControllerOptionsWithEndpoint = merge(
      this.overrides[type],
      options
    )

    // IPFS options defaults
    const ipfsOptions = merge(
      {
        start: false,
        init: false
      },
      opts.test === true
        ? {
            config: testsConfig(opts),
            preload: { enabled: false }
          }
        : {},
      opts.ipfsOptions
    )

    let ctl: Controller
    if (opts.type === 'proc') {
      // spawn in-proc controller
      ctl = new ControllerProc({ ...opts, ipfsOptions })
    } else if (opts.remote === true) {
      // spawn remote controller
      ctl = await this._spawnRemote({ ...opts, ipfsOptions })
    } else {
      // spawn daemon controller
      ctl = new ControllerDaemon({ ...opts, ipfsOptions })
    }

    // Save the controller
    this.controllers.push(ctl)

    // Auto init and start controller
    if (opts.disposable === true && (options.ipfsOptions == null || options.ipfsOptions?.init !== false)) {
      await ctl.init(ipfsOptions.init)
    }
    if (opts.disposable === true && (options.ipfsOptions == null || options.ipfsOptions?.start !== false)) {
      await ctl.start()
    }

    return ctl
  }

  /**
   * Stop all controllers
   */
  async clean (): Promise<void> {
    await Promise.all(this.controllers.map(async n => await n.stop()))
    this.controllers = []
  }
}

export default DefaultFactory
