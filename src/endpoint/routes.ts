import boom from '@hapi/boom'
import { logger } from '@libp2p/logger'
import Joi from 'joi'
import { nanoid } from 'nanoid'
import type { Controller, Factory } from '../index.js'
import type { Server } from '@hapi/hapi'

const debug = logger('ipfsd-ctl:routes')

const routeOptions = {
  validate: {
    query: Joi.object({
      id: Joi.string().required()
    })
  }
}

const badRequest = (err: Error & { stdout?: string }): void => {
  let msg
  if (err.stdout != null) {
    msg = err.stdout + ' - ' + err.message
  } else {
    msg = err.message
  }
  debug(err)
  throw boom.badRequest(msg)
}

const nodes: Record<string, Controller> = {}

export default (server: Server, createFactory: () => Factory | Promise<Factory>): void => {
  /**
   * Spawn a controller
   */
  server.route({
    method: 'POST',
    path: '/spawn',
    handler: async (request) => {
      const options: any = request.payload ?? {}
      try {
        const ipfsd = await createFactory()
        const id = nanoid()
        nodes[id] = await ipfsd.spawn({
          ...options,
          // init/start will be invoked by the client
          init: false,
          start: false
        })

        return {
          id,
          options,
          info: await nodes[id].info()
        }
      } catch (err: any) {
        badRequest(err)
      }
    }
  })

  /**
   * Return node info
   */
  server.route({
    method: 'GET',
    path: '/info',
    handler: async (request) => {
      const id = request.query.id

      try {
        return await nodes[id].info()
      } catch (err: any) {
        badRequest(err)
      }
    },
    options: routeOptions
  })

  /*
   * Initialize a repo
   */
  server.route({
    method: 'POST',
    path: '/init',
    handler: async (request) => {
      const id = request.query.id
      const payload = request.payload ?? {}

      try {
        await nodes[id].init(payload)

        return await nodes[id].info()
      } catch (err: any) {
        badRequest(err)
      }
    },
    options: routeOptions
  })

  /*
   * Start the daemon
   */
  server.route({
    method: 'POST',
    path: '/start',
    handler: async (request) => {
      const id = request.query.id
      const payload = request.payload ?? {}

      try {
        await nodes[id].start(payload)

        return await nodes[id].info()
      } catch (err: any) {
        badRequest(err)
      }
    },
    options: routeOptions
  })

  /*
   * Stop the daemon
   */
  server.route({
    method: 'POST',
    path: '/stop',
    handler: async (request, h) => {
      const id = request.query.id
      const payload = request.payload ?? {}

      try {
        await nodes[id].stop(payload)

        return h.response().code(200)
      } catch (err: any) {
        badRequest(err)
      }
    },
    options: routeOptions
  })

  /*
   * Delete the repo that was being used.
   * If the node was marked as `disposable` this will be called
   * automatically when the process is exited.
   */
  server.route({
    method: 'POST',
    path: '/cleanup',
    handler: async (request, h) => {
      const id = request.query.id
      const payload = request.payload ?? {}

      try {
        await nodes[id].cleanup(payload)

        return h.response().code(200)
      } catch (err: any) {
        badRequest(err)
      }
    },
    options: routeOptions
  })
}
