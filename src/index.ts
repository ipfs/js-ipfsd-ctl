import Server from './endpoint/server.js'
import DefaultFactory from './factory.js'
import type { KuboController, KuboOptions } from './kubo/index.js'

export * from './kubo/index.js'
export type ControllerType = 'kubo'

export interface Controller<API = unknown, Options = ControllerOptions, Info extends Record<string, any> = Record<string, any>, InitArgs = unknown, StartArgs = unknown, StopArgs = unknown, CleanupArgs = unknown> {
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

export interface ControllerOptions<InitOptions = unknown, StartOptions = unknown> {
  /**
   * The type of controller
   */
  type?: ControllerType

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

export interface ControllerOptionsOverrides {
  kubo?: KuboOptions
}

export interface SpawnOptions {
  /**
   * Use remote endpoint to spawn the controllers. Defaults to `true` when not in node
   */
  remote?: true
}

export interface Factory<DefaultController extends Controller = Controller> {
  /**
   * Create a node
   */
  spawn(options?: KuboOptions & SpawnOptions): Promise<KuboController>
  spawn(options?: ControllerOptions & SpawnOptions): Promise<DefaultController>

  /**
   * Shut down all previously created nodes that are still running
   */
  clean(): Promise<void>

  /**
   * The previously created nodes that are still running
   */
  controllers: Controller[]

  /**
   * The default options that will be applied to all nodes
   */
  options: ControllerOptions

  /**
   * Config overrides that will be applied to specific node types
   */
  overrides: ControllerOptionsOverrides
}

/**
 * Creates a factory
 */
export function createFactory (options: KuboOptions, overrides?: ControllerOptionsOverrides): Factory<KuboController>
export function createFactory (options?: ControllerOptions, overrides?: ControllerOptionsOverrides): Factory<Controller>
export function createFactory (options?: ControllerOptions, overrides?: ControllerOptionsOverrides): Factory<Controller> {
  return new DefaultFactory(options, overrides)
}

/**
 * Creates a node
 */
export async function createController (options: KuboOptions & SpawnOptions): Promise<KuboController>
export async function createController (options?: any): Promise<any> {
  const f = new DefaultFactory()
  return f.spawn(options)
}

/**
 * Create a Endpoint Server
 */
export const createServer = (options?: number | { port: number }, factoryOptions: ControllerOptions = {}, factoryOverrides: ControllerOptionsOverrides = {}): Server => {
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
