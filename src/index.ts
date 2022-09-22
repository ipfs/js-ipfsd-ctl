import DefaultFactory from './factory.js'
import Server from './endpoint/server.js'
import type { Controller, ControllerOptions, ControllerOptionsOverrides, Factory, NodeType } from './types'

/**
 * Creates a factory
 */
export const createFactory = <T extends NodeType>(options: ControllerOptions<T>, overrides: ControllerOptionsOverrides) => {
  return new DefaultFactory<T>(options, overrides) as Factory<T>
}

/**
 * Creates a node
 */
export const createController = async <T extends NodeType>(options: ControllerOptions<T>): Promise<Controller<T>> => {
  const f = new DefaultFactory<T>()
  return await f.spawn(options)
}

/**
 * Create a Endpoint Server
 */
export const createServer = <T extends NodeType>(options?: number | { port: number }, factoryOptions: ControllerOptions<T> = {}, factoryOverrides: ControllerOptionsOverrides = {}): Server => {
  if (typeof options === 'number') {
    options = { port: options }
  }

  return new Server(options, async () => {
    return createFactory<T>(factoryOptions, factoryOverrides)
  })
}
