import type { Node, NodeOptions } from '../index.js'
import type { KuboRPCClient } from 'kubo-rpc-client'

export interface KuboInit {
  emptyRepo?: boolean
  profiles?: string[]

  /**
   * JSON config directives to patch the config file with
   */
  config?: Record<string, any>

  /**
   * Extra CLI args used to invoke `kubo init`
   */
  args?: string[]
}

export interface KuboEd25519Init extends KuboInit {
  algorithm?: 'ed25519'
}

export interface KuboRSAInit extends KuboInit {
  algorithm: 'rsa'
  bits?: number
}

export type KuboInitOptions = KuboEd25519Init | KuboRSAInit

export interface KuboStartOptions {
  offline?: boolean
  ipnsPubsub?: boolean
  pubsub?: boolean
  repoAutoMigrate?: boolean

  /**
   * Extra CLI args used to invoke `kubo daemon`
   */
  args?: string[]
}

export interface KuboOptions extends NodeOptions<boolean | KuboInitOptions, boolean | KuboStartOptions> {
  type: 'kubo'

  /**
   * A function that creates an instance of `KuboRPCClient`
   */
  rpc?(...args: any[]): KuboRPCClient

  /**
   * Path to a Kubo executable
   */
  bin?: string

  /**
   * The path to a repo directory. It will be created during init if it does not
   * already exist.
   */
  repo?: string
}

export interface KuboInfo {
  pid?: number
  version?: string
  peerId?: string
  multiaddrs: string[]
  api?: string
  repo: string
}

export interface KuboNode extends Node<KuboRPCClient, KuboOptions, KuboInfo, KuboInitOptions, KuboStartOptions> {

}
