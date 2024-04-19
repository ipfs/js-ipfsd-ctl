import type { KuboNode, KuboInfo, KuboInitOptions, KuboOptions, KuboStartOptions, KuboStopOptions } from './index.js'
import type { PeerInfo } from '@libp2p/interface'
import type { KuboRPCClient } from 'kubo-rpc-client'

export interface KuboClientInit extends KuboOptions {
  endpoint: string
  id: string
  disposable: boolean
  repo: string
}

/**
 * Node for remote nodes
 */
export default class KuboClient implements KuboNode {
  public options: KuboOptions & Required<Pick<KuboOptions, 'rpc'>>
  public peerInfo?: PeerInfo
  public id: string
  public disposable: boolean
  public repo: string

  private readonly endpoint: string
  private _api?: KuboRPCClient
  private readonly initArgs?: KuboInitOptions
  private readonly startArgs?: KuboStartOptions
  private readonly stopArgs?: KuboStopOptions

  constructor (options: KuboClientInit) {
    if (options.rpc == null) {
      throw new Error('Please pass an rpc option')
    }

    // @ts-expect-error cannot detect rpc is present
    this.options = options
    this.endpoint = options.endpoint
    this.disposable = options.disposable
    this.id = options.id
    this.repo = options.repo

    if (options.init != null && typeof options.init !== 'boolean') {
      this.initArgs = options.init
    }

    if (options.start != null && typeof options.start !== 'boolean') {
      this.startArgs = options.start
    }

    if (options.stop != null) {
      this.stopArgs = options.stop
    }
  }

  get api (): KuboRPCClient {
    if (this._api == null) {
      throw new Error('Not started')
    }

    return this._api
  }

  async info (): Promise<KuboInfo> {
    const response = await fetch(`${this.endpoint}/info?${new URLSearchParams({ id: this.id })}`, {
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error(`Error getting remote kubo info - ${await response.text()}`)
    }

    return response.json()
  }

  async init (args?: KuboInitOptions): Promise<void> {
    const response = await fetch(`${this.endpoint}/init?${new URLSearchParams({ id: this.id })}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        ...(this.initArgs ?? {}),
        ...(args ?? {})
      })
    })

    if (!response.ok) {
      throw new Error(`Error initializing remote kubo - ${await response.text()}`)
    }
  }

  async start (args?: KuboStartOptions): Promise<void> {
    const response = await fetch(`${this.endpoint}/start?${new URLSearchParams({ id: this.id })}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        ...(this.startArgs ?? {}),
        ...(args ?? {})
      })
    })

    if (!response.ok) {
      throw new Error(`Error starting remote kubo - ${await response.text()}`)
    }

    const info = await response.json()
    this._api = this.options.rpc(info.api)
  }

  async stop (args?: KuboStopOptions): Promise<void> {
    const response = await fetch(`${this.endpoint}/stop?${new URLSearchParams({ id: this.id })}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        ...(this.stopArgs ?? {}),
        ...(args ?? {})
      })
    })

    if (!response.ok) {
      throw new Error(`Error stopping remote kubo - ${await response.text()}`)
    }

    if (this.disposable) {
      await this.cleanup()
    }
  }

  async cleanup (): Promise<void> {
    const response = await fetch(`${this.endpoint}/cleanup?${new URLSearchParams({ id: this.id })}`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error(`Error cleaning up remote kubo - ${await response.text()}`)
    }
  }
}
