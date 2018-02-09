/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const proxyquire = require('proxyquire')
const multiaddr = require('multiaddr')

const Hapi = require('hapi')

const routes = proxyquire(
  '../../src/endpoint/routes',
  {
    '../factory-daemon': class {
      spawn (ops, cb) {
        const node = {}
        node.apiAddr = multiaddr('/ip4/127.0.0.1/tcp/5001')
        node.gatewayAddr = multiaddr('/ip4/127.0.0.1/tcp/8080')
        node.started = false

        node.init = (opts, cb) => cb(null, node)
        node.cleanup = (cb) => cb()

        node.start = (_, cb) => {
          node.started = true

          const api = {}
          api.apiHost = node.apiAddr.nodeAddress().address
          api.apiPort = node.apiAddr.nodeAddress().port

          api.gatewayHost = node.gatewayAddr.nodeAddress().address
          api.gatewayPort = node.gatewayAddr.nodeAddress().port

          node.api = api
          cb(null, api)
        }

        node.stop = (cb) => node.killProcess(cb)

        node.killProcess = (cb) => {
          node.started = false
          cb()
        }

        node.pid = (cb) => cb(null, 1)
        node.getConfig = (key, cb) => cb(null, { foo: 'bar' })
        node.setConfig = (key, val, cb) => cb()

        node.start(null, () => cb(null, node))
      }
    }
  }
)

describe('routes', () => {
  let id
  let server

  before(() => {
    server = new Hapi.Server()
    server.connection()
    routes(server)
  })

  after((done) => server.stop(done))

  describe('POST /spawn', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'POST',
        url: '/spawn',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        expect(res.result.id).to.exist()
        expect(res.result.api.apiAddr).to.exist()
        expect(res.result.api.gatewayAddr).to.exist()

        id = res.result.id
        done()
      })
    })
  })

  describe('GET /api-addr', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'GET',
        url: `/api-addr?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { id }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        expect(res.result.apiAddr).to.exist()
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'GET',
        url: '/api-addr',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })

  describe('GET /getaway-addr', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'GET',
        url: `/getaway-addr?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { id }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        expect(res.result.getawayAddr).to.exist()
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'GET',
        url: '/getaway-addr',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })

  describe('POST /init', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'POST',
        url: `/init?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { id }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'POST',
        url: '/init',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })

  describe('POST /cleanup', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'POST',
        url: `/cleanup?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { id }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'POST',
        url: '/cleanup',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })

  describe('POST /start', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'POST',
        url: `/start?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { id }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'POST',
        url: '/start',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })

  describe('POST /stop', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'POST',
        url: `/stop?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { id }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'POST',
        url: '/stop',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })

  describe('POST /kill', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'POST',
        url: `/kill?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { id }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'POST',
        url: '/kill',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })

  describe('GET /pid', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'GET',
        url: `/pid?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { id }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'GET',
        url: '/pid',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })

  describe('GET /config', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'GET',
        url: `/config?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { id }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'GET',
        url: '/config',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })

  describe('PUT /config', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'PUT',
        url: `/config?id=${id}`,
        headers: { 'content-type': 'application/json' },
        payload: { key: 'foo', value: 'bar' }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'PUT',
        url: '/config',
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })
})
