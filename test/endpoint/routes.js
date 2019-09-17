/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const proxyquire = require('proxyquire')
const multiaddr = require('multiaddr')

const Hapi = require('@hapi/hapi')

const routes = proxyquire(
  '../../src/endpoint/routes',
  {
    '../factory-daemon': class {
      async spawn () {
        const node = {}
        node.apiAddr = multiaddr('/ip4/127.0.0.1/tcp/5001')
        node.gatewayAddr = multiaddr('/ip4/127.0.0.1/tcp/8080')
        node.started = false

        node.init = () => Promise.resolve(node)
        node.cleanup = () => Promise.resolve()

        node.start = () => {
          node.started = true

          const api = {}
          api.apiHost = node.apiAddr.nodeAddress().address
          api.apiPort = node.apiAddr.nodeAddress().port

          api.gatewayHost = node.gatewayAddr.nodeAddress().address
          api.gatewayPort = node.gatewayAddr.nodeAddress().port

          node.api = api

          return Promise.resolve(api)
        }

        node.stop = (timeout) => node.killProcess(timeout)

        node.killProcess = (timeout) => {
          node.started = false
          return Promise.resolve()
        }

        node.pid = () => Promise.resolve(1)
        node.getConfig = (key) => Promise.resolve({ foo: 'bar' })
        node.setConfig = (key, val) => Promise.resolve()

        await node.start()

        return node
      }
    }
  }
)

describe('routes', () => {
  let id
  let server

  before(() => {
    server = new Hapi.Server()
    routes(server)
  })

  after(async () => {
    await server.stop()
  })

  describe('POST /spawn', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/spawn'
      })
      expect(res.statusCode).to.equal(200)
      expect(res.result._id).to.exist()
      expect(res.result.apiAddr).to.exist()
      expect(res.result.gatewayAddr).to.exist()

      id = res.result._id
    })
  })

  describe('GET /api-addr', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'GET',
        url: `/api-addr?id=${id}`
      })

      expect(res.statusCode).to.equal(200)
      expect(res.result.apiAddr).to.exist()
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api-addr'
      })

      expect(res.statusCode).to.equal(400)
    })
  })

  describe('GET /getaway-addr', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'GET',
        url: `/getaway-addr?id=${id}`
      })

      expect(res.statusCode).to.equal(200)
      expect(res.result.getawayAddr).to.exist()
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/getaway-addr'
      })

      expect(res.statusCode).to.equal(400)
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

  describe('POST /stop', () => {
    it('should return 200 without timeout', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/stop?id=${id}`
      })

      expect(res.statusCode).to.equal(200)
    })

    it('should return 200 with timeout', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/stop?id=${id}`,
        payload: { timeout: 1000 }
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

  describe('POST /kill', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/kill?id=${id}`
      })

      expect(res.statusCode).to.equal(200)
    })

    it('should return 200 with timeout', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/kill?id=${id}`,
        payload: { timeout: 1000 }
      })

      expect(res.statusCode).to.equal(200)
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/kill'
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

  describe('GET /config', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'GET',
        url: `/config?id=${id}`
      })

      expect(res.statusCode).to.equal(200)
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/config'
      })

      expect(res.statusCode).to.equal(400)
    })
  })

  describe('PUT /config', () => {
    it('should return 200', async () => {
      const res = await server.inject({
        method: 'PUT',
        url: `/config?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { key: 'foo', value: 'bar' }
      })

      expect(res.statusCode).to.equal(200)
    })

    it('should return 400', async () => {
      const res = await server.inject({
        method: 'PUT',
        url: '/config'
      })

      expect(res.statusCode).to.equal(400)
    })
  })
})
