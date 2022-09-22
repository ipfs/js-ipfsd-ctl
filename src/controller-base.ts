import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import type { ExecaChildProcess } from 'execa'
// import fs from 'fs/promises'
// import mergeOptions from 'merge-options'
// import { logger } from '@libp2p/logger'
// import { execa } from 'execa'
// import { nanoid } from 'nanoid'
// import path from 'path'
// import os from 'os'
import { tmpDir, defaultRepo } from './utils.js'
// import waitFor from 'p-wait-for'
import type { Controller, ControllerOptions, InitOptions, NodeType, PeerData } from './types'

// const merge = mergeOptions.bind({ ignoreUndefined: true })
abstract class ControllerBase<T extends NodeType = NodeType> implements Controller<T> {
  opts: ControllerOptions<T>
  path: any
  exec: any
  env: any
  disposable!: boolean
  subprocess: null | ExecaChildProcess<string> = null
  initialized: boolean = false
  started: boolean = false
  clean: boolean = true
  apiAddr: null | Multiaddr = null
  grpcAddr: null | Multiaddr = null
  gatewayAddr: null | Multiaddr = null
  api!: Controller<T>['api']
  _peerId: null | PeerData = null
  constructor (opts: ControllerOptions<T>) {
    this.opts = opts

    this.disposable = this.opts.disposable ?? false
    // if (this.opts.ipfsOptions != null) {
    this.path = this.opts.ipfsOptions?.repo ?? (this.disposable ? tmpDir(this.opts.type) : defaultRepo(this.opts.type))
    // }
    //   this.path = (Boolean(this.opts.ipfsOptions.repo)) || (opts.disposable ? tmpDir(opts.type) : defaultRepo(opts.type))
    //   this.exec = this.opts.ipfsBin
    //   this.env = merge({ IPFS_PATH: this.path }, this.opts.env)
    //   this.disposable = this.opts.disposable
    //   this.subprocess = null
    //   this.initialized = false
    //   this.started = false
    //   this.clean = true
    //   /** @type {Multiaddr} */
    //   this.apiAddr // eslint-disable-line no-unused-expressions
    //   this.grpcAddr = null
    //   this.gatewayAddr = null
    //   this.api = null
    //   /** @type {import('./types').PeerData | null} */
    //   this._peerId = null
  }

  abstract init (options?: InitOptions | undefined): Promise<Controller<T>>
  abstract start (): Promise<Controller<T>>
  abstract stop (): Promise<Controller<T>>
  abstract cleanup (): Promise<Controller<T>>
  abstract pid (): Promise<number>
  abstract version (): Promise<string>

  get peer () {
    if (this._peerId == null) {
      throw new Error('Not started')
    }

    return this._peerId
  }

  _setApi (addr: string) {
    this.apiAddr = multiaddr(addr)
  }

  _setGrpc (addr: string) {
    this.grpcAddr = multiaddr(addr)
  }

  _setGateway (addr: string) {
    this.gatewayAddr = multiaddr(addr)
  }

  _createApi (): void {
    throw new Error('Not implemented')
  }

  async _postStart (): Promise<void> {
    if (this.api != null) {
      this.started = true
      // Add `peerId`
      this._peerId = await this.api.id()
    }
  }
}
export default ControllerBase
