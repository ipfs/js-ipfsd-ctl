/* eslint-env mocha */

import Hapi from '@hapi/hapi'
import { expect } from 'aegir/chai'
import * as kubo from 'kubo'
import { create as createKuboRPCClient } from 'kubo-rpc-client'
import { isNode } from 'wherearewe'
import routes from '../../src/endpoint/routes.js'
import { createFactory } from '../../src/index.js'
import type { KuboInfo } from '../../src/index.js'

describe('routes', function () {
  this.timeout(60000)

  let id: string
  let server: Hapi.Server

  before(async () => {
    server = new Hapi.Server({ port: 43134 })
    routes(server, createFactory({
      type: 'kubo',
      rpc: createKuboRPCClient,
      bin: isNode ? kubo.path() : undefined
    }), {})
  })

  after(async () => {
    await server.stop()
  })

  describe('POST /spawn', () => {
    it('should return 200', async () => {
      const options = {
        test: true,
        init: {
          config: {
            foo: 'bar'
          }
        }
      }

      const res = await server.inject<any>({
        method: 'POST',
        url: '/spawn',
        payload: options
      })
      expect(res).to.have.property('statusCode', 200)
      expect(res).to.have.nested.property('result.id')

      // should return passed options with the id added
      expect(res).to.have.deep.nested.property('result.options', options)
      expect(res).to.have.nested.property('result.info')

      id = res.result.id
    })
  })

  describe('POST /init', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/init?id=${id}`
      })

      expect(res.statusCode).to.equal(200)
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/init'
      })

      expect(res.statusCode).to.equal(400)
    })
  })

  describe('POST /start', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/start?id=${id}`
      })

      expect(res.statusCode).to.equal(200)
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/start'
      })

      expect(res.statusCode).to.equal(400)
    })
  })

  describe('GET /info', () => {
    it('should return 200', async () => {
      const res = await server.inject<KuboInfo>({
        method: 'GET',
        url: `/info?id=${id}`
      })

      expect(res.statusCode).to.equal(200)

      expect(res.result).to.have.property('version').that.is.a('string')
      expect(res.result).to.have.property('pid').that.is.a('number')
      expect(res.result).to.have.property('api').that.is.a('string')
      expect(res.result).to.have.property('repo').that.is.a('string')
      expect(res.result).to.have.property('multiaddrs').that.is.an('array')
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/info'
      })

      expect(res.statusCode).to.equal(400)
    })
  })

  describe('POST /stop', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/stop?id=${id}`
      })

      expect(res.statusCode).to.equal(200)
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/stop'
      })

      expect(res.statusCode).to.equal(400)
    })
  })

  describe('POST /cleanup', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/cleanup?id=${id}`
      })

      expect(res.statusCode).to.equal(200)
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/cleanup'
      })

      expect(res.statusCode).to.equal(400)
    })
  })
})
