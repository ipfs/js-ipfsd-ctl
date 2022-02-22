
import { EventEmitter } from 'events'
import { IPFS } from 'ipfs-core-types'
import type { Multiaddr } from 'multiaddr'

export interface Subprocess {
  stderr: EventEmitter | null
  stdout: EventEmitter | null
}

export interface Controller {
  init: (options?: InitOptions) => Promise<Controller>
  start: () => Promise<Controller>
  stop: () => Promise<Controller>
  cleanup: () => Promise<Controller>
  pid: () => Promise<number>
  version: () => Promise<string>
  path: string
  started: boolean
  initialized: boolean
  clean: boolean
  api: IPFS
  subprocess?: Subprocess | null
  opts: ControllerOptions
  apiAddr: Multiaddr
}

export interface RemoteState {
  id: string
  path: string
  initialized: boolean
  started: boolean
  disposable: boolean
  clean: boolean
  apiAddr: string
  gatewayAddr: string
  grpcAddr: string
}

export type NodeType = 'js' | 'go' | 'proc'

export interface InitOptions {
  pass?: string
  bits?: number
  algorithm?: string
  emptyRepo?: boolean
  profiles?: string[]
  allowNew?: boolean
  privateKey?: string
}

export interface PreloadOptions {
  enabled?: boolean
  addresses?: string[]
}

export interface ExperimentalOptions {
  sharding?: boolean
  ipnsPubsub?: boolean
}

export interface CircuitRelayHopOptions {
  enabled: boolean
  active: boolean
}

export interface CircuitRelayOptions {
  enabled: boolean
  hop: CircuitRelayHopOptions
}

export interface IPFSOptions {
  /**
   * The file path at which to store the IPFS node’s data. Alternatively, you can set up a customized storage system by providing an ipfs.Repo instance.
   */
  repo?: string | any
  /**
   * Initialize the repo when creating the IPFS node. Instead of a boolean, you may provide an object with custom initialization options. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsinit
   */
  init?: boolean | InitOptions
  /**
   * If false, do not automatically start the IPFS node. Instead, you’ll need to manually call node.start() yourself.
   */
  start?: boolean
  /**
   * A passphrase to encrypt/decrypt your keys.
   */
  pass?: string
  /**
   * Prevents all logging output from the IPFS node.
   */
  silent?: boolean
  /**
   * Configure circuit relay. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsrelay
   */
  relay?: any
  /**
   * Configure remote preload nodes. The remote will preload content added on this node, and also attempt to preload objects requested by this node. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionspreload
   */
  preload?: boolean | PreloadOptions
  /**
   * Enable and configure experimental features. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsexperimental
   */
  EXPERIMENTAL?: ExperimentalOptions
  /**
   * Modify the default IPFS node config. This object will be merged with the default config; it will not replace it. The default config is documented in the js-ipfs config file docs. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsconfig
   */
  config?: any
  /**
   * Modify the default IPLD config. This object will be merged with the default config; it will not replace it. Check IPLD docs for more information on the available options. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsipld
   */
  ipld?: any
  /**
   * The libp2p option allows you to build your libp2p node by configuration, or via a bundle function. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionslibp2p
   */
  libp2p?: any
  /**
   * Configure the libp2p connection manager. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsconnectionmanager
   */
  connectionManager?: any
  /**
   * Run the node offline
   */
  offline?: boolean
  /**
   * Perform any required repo migrations
   */
  repoAutoMigrate?: boolean
}

export interface ControllerOptions {
  /**
   * Flag to activate custom config for tests
   */
  test?: boolean
  /**
   * Use remote endpoint to spawn the controllers. Defaults to `true` when not in node
   */
  remote?: boolean
  /**
   * Endpoint URL to manage remote Controllers. (Defaults: 'http://localhost:43134')
   */
  endpoint?: string
  /**
   * A new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits
   */
  disposable?: boolean
  /**
   * The daemon type
   */
  type?: NodeType
  /**
   * Additional environment variables, passed to executing shell. Only applies for Daemon controllers
   */
  env?: Record<string, string>
  /**
   * Custom cli args
   */
  args?: string[]
  /**
   * Reference to an ipfs-http-client module
   */
  ipfsHttpModule?: any
  /**
   * Reference to an ipfs or ipfs-core module
   */
  ipfsModule?: any
  /**
   * Reference to an ipfs-core module
   */
  ipfsClientModule?: any
  /**
   * Path to a IPFS executable
   */
  ipfsBin?: string
  /**
   * Options for the IPFS node
   */
  ipfsOptions?: IPFSOptions
  /**
   * Whether to use SIGKILL to quit a daemon that does not stop after `.stop()` is called. (default true)
   */
  forceKill?: boolean
  /**
   * How long to wait before force killing a daemon in ms. (default 5000)
   */
  forceKillTimeout?: number
}

export interface ControllerOptionsOverrides {
  js?: ControllerOptions
  go?: ControllerOptions
  proc?: ControllerOptions
}

export interface Factory {
  tmpDir: (options?: ControllerOptions) => Promise<string>
  spawn: (options?: ControllerOptions) => Promise<Controller>
  clean: () => Promise<void>
  controllers: Controller[]
  opts: ControllerOptions
}
