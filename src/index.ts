/**
 * @packageDocumentation
 *
 * This module allows you to spawn long-lived IPFS implementations from any JS environment and interact with the as is they were in the local process.
 *
 * It is designed mostly for testing interoperability and is not suitable for production use.
 *
 * ## Spawning a single noder: `createNode`
 *
 * @example Spawning a Kubo node
 *
 * ```TypeScript
 * import { createNode } from 'ipfsd-ctl'
 * import { path } from 'kubo'
 * import { create } from 'kubo-rpc-client'
 *
 * const node = await createNode({
 *   type: 'kubo',
 *   rpc: create,
 *   bin: path()
 * })
 *
 * console.info(await node.api.id())
 * ```
 *
 * ## Manage multiple nodes: `createFactory`
 *
 * Use a factory to spawn multiple nodes based on some common template.
 *
 * @example Spawning multiple Kubo nodes
 *
 * ```TypeScript
 * import { createFactory } from 'ipfsd-ctl'
 * import { path } from 'kubo'
 * import { create } from 'kubo-rpc-client'
 *
 * const factory = createFactory({
 *   type: 'kubo',
 *   rpc: create,
 *   bin: path()
 * })
 *
 * const node1 = await factory.spawn()
 * const node2 = await factory.spawn()
 * //...etc
 *
 * // later stop all nodes
 * await factory.clean()
 * ```
 *
 * ## Override config based on implementation type
 *
 * `createFactory` takes a second argument that can be used to pass default options to an implementation based on the `type` field.
 *
 * ```TypeScript
 * import { createFactory } from 'ipfsd-ctl'
 * import { path } from 'kubo'
 * import { create } from 'kubo-rpc-client'
 *
 * const factory = createFactory({
 *   type: 'kubo',
 *   test: true
 * }, {
 *   otherImpl: {
 *     //...other impl args
 *   }
 * })
 *
 * const kuboNode = await factory.spawn()
 * const otherImplNode = await factory.spawn({
 *   type: 'otherImpl'
 * })
 * ```
 *
 * ## Spawning nodes from browsers
 *
 * To spawn nodes from browsers, first start an ipfsd-ctl server from node.js and make the address known to the browser (the default way is to set `process.env.IPFSD_CTL_SERVER` in your bundle):
 *
 * @example Create server
 *
 * In node.js:
 *
 * ```TypeScript
 * // Start a remote disposable node, and get access to the api
 * // print the node id, and stop the temporary daemon
 *
 * import { createServer } from 'ipfsd-ctl'
 *
 * const port = 9090
 * const server = createServer(port, {
 *   type: 'kubo',
 *   test: true
 * }, {
 *    // overrides
 * })
 * await server.start()
 * ```
 *
 * In a browser:
 *
 * ```TypeScript
 * import { createFactory } from 'ipfsd-ctl'
 *
 * const factory = createFactory({
 *   // or you can set process.env.IPFSD_CTL_SERVER to http://localhost:9090
 *   endpoint: `http://localhost:${port}`
 * })
 *
 * const node = await factory.createNode({
 *   type: 'kubo'
 * })
 * console.info(await node.api.id())
 * ```
 *
 * ## Disposable vs non Disposable nodes
 *
 * `ipfsd-ctl` can spawn `disposable` and `non-disposable` nodes.
 *
 * - `disposable`- Disposable nodes are useful for tests or other temporary use cases, they create a temporary repo which is deleted automatically when the node is stopped
 * - `non-disposable` - Disposable nodes will not delete their repo when stopped
 */

import Server from './endpoint/server.js'
import DefaultFactory from './factory.js'
import type { KuboNode, KuboOptions } from './kubo/index.js'

export * from './kubo/index.js'
export type NodeType = 'kubo'

export interface Node<API = unknown, Options = NodeOptions, Info extends Record<string, any> = Record<string, any>, InitArgs = unknown, StartArgs = unknown, StopArgs = unknown, CleanupArgs = unknown> {
  api: API
  options: Options

  /**
   * Return information about a node
   */
  info(): Promise<Info>

  /**
   * Perform any pre-start tasks such as creating a repo, generating a peer id,
   * etc
   */
  init(args?: InitArgs): Promise<void>

  /**
   * Start the node
   */
  start(args?: StartArgs): Promise<void>

  /**
   * Stop a node that has previously been started
   */
  stop(args?: StopArgs): Promise<void>

  /**
   * Perform any resource cleanup after stopping a disposable node
   */
  cleanup(args?: CleanupArgs): Promise<void>
}

export interface NodeOptions<InitOptions = unknown, StartOptions = unknown> {
  /**
   * The type of controller
   */
  type?: NodeType

  /**
   * Flag to activate custom config for tests
   */
  test?: boolean

  /**
   * A new repo is created and initialized for each invocation, as well as
   * cleaned up automatically once the process exits
   */
  disposable?: boolean

  /**
   * Where applicable, this endpoint will be used to spawn nodes remotely
   *
   * @default http://127.0.0.1:43134
   */
  endpoint?: string

  /**
   * Additional environment variables, passed to executing shell. Only applies
   * for Daemon controllers
   */
  env?: Record<string, string>

  /**
   * Custom cli args
   */
  args?: string[]

  /**
   * How long to wait before force killing a daemon in ms
   *
   * @default 5000
   */
  forceKillTimeout?: number

  /**
   * Init options
   */
  init?: InitOptions

  /**
   * Start options
   */
  start?: StartOptions
}

export interface NodeOptionsOverrides {
  kubo?: KuboOptions
}

export interface SpawnOptions {
  /**
   * Use remote endpoint to spawn the controllers. Defaults to `true` when not in node
   */
  remote?: true
}

export interface Factory<DefaultNode extends Node = Node> {
  /**
   * Create a node
   */
  spawn(options?: KuboOptions & SpawnOptions): Promise<KuboNode>
  spawn(options?: NodeOptions & SpawnOptions): Promise<DefaultNode>

  /**
   * Shut down all previously created nodes that are still running
   */
  clean(): Promise<void>

  /**
   * The previously created nodes that are still running
   */
  controllers: Node[]

  /**
   * The default options that will be applied to all nodes
   */
  options: NodeOptions

  /**
   * Config overrides that will be applied to specific node types
   */
  overrides: NodeOptionsOverrides
}

/**
 * Creates a factory
 */
export function createFactory (options: KuboOptions, overrides?: NodeOptionsOverrides): Factory<KuboNode>
export function createFactory (options?: NodeOptions, overrides?: NodeOptionsOverrides): Factory<Node>
export function createFactory (options?: NodeOptions, overrides?: NodeOptionsOverrides): Factory<Node> {
  return new DefaultFactory(options, overrides)
}

/**
 * Creates a node
 */
export async function createNode (options: KuboOptions & SpawnOptions): Promise<KuboNode>
export async function createNode (options?: any): Promise<any> {
  const f = new DefaultFactory()
  return f.spawn(options)
}

/**
 * Create a Endpoint Server
 */
export const createServer = (options?: number | { port: number }, factoryOptions: KuboOptions | NodeOptions = {}, factoryOverrides: NodeOptionsOverrides = {}): Server => {
  let port: number | undefined

  if (typeof options === 'number') {
    port = options
  } else if (options != null) {
    port = options.port
  }

  return new Server({
    port,
    host: '127.0.0.1'
  }, () => {
    return createFactory(factoryOptions, factoryOverrides)
  })
}
