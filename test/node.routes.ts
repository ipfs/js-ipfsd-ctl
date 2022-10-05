/* eslint-env mocha */

import { expect } from 'aegir/chai'
import Hapi from '@hapi/hapi'
import routes from '../src/endpoint/routes.js'
import { createFactory } from '../src/index.js'
import * as ipfsModule from 'ipfs'
import * as ipfsHttpModule from 'ipfs-http-client'

describe('routes', function () {
  this.timeout(60000)

  let id: string
  let server: Hapi.Server

  before(async () => {
    server = new Hapi.Server({ port: 43134 })
    routes(server, async () => {
      return createFactory({
        ipfsModule,
        ipfsHttpModule,
        ipfsBin: ipfsModule.path()
      })
    })
  })

  after(async () => {
    await server.stop()
  })

  describe('POST /spawn', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/spawn',
        payload: {
          test: true,
          ipfsOptions: {
            init: false,
            start: false
          }
        }
      })
      expect(res).to.have.property('statusCode', 200)
      expect(res).to.have.nested.property('result.id')
      expect(res).to.have.nested.property('result.apiAddr')
      expect(res).to.have.nested.property('result.gatewayAddr')

      // @ts-expect-error res.result is an object
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

  describe('GET /pid', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'GET',
        url: `/pid?id=${id}`
      })

      expect(res.statusCode).to.equal(200)
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/pid'
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
