/* eslint-env mocha */
'use strict'

const proxyquire = require('proxyquire')
const multiaddr = require('multiaddr')
const Hapi = require('hapi')
const chai = require('chai')
const dirtyChai = require('dirty-chai')

const expect = chai.expect
chai.use(dirtyChai)

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

        node.stop = (timeout, cb) => node.killProcess(timeout, cb)

        node.killProcess = (timeout, cb) => {
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
        url: '/spawn'
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        expect(res.result._id).to.exist()
        expect(res.result.apiAddr).to.exist()
        expect(res.result.gatewayAddr).to.exist()

        id = res.result._id
        done()
      })
    })
  })

  describe('GET /api-addr', () => {
    it('should return 200', (done) => {
      server.inject({
        method: 'GET',
        url: `/api-addr?id=${id}`
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        expect(res.result.apiAddr).to.exist()
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'GET',
        url: '/api-addr'
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
        url: `/getaway-addr?id=${id}`
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        expect(res.result.getawayAddr).to.exist()
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'GET',
        url: '/getaway-addr'
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
        url: `/init?id=${id}`
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'POST',
        url: '/init'
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
        url: `/cleanup?id=${id}`
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'POST',
        url: '/cleanup'
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
        url: `/start?id=${id}`
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'POST',
        url: '/start'
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })

  describe('POST /stop', () => {
    it('should return 200 without timeout', (done) => {
      server.inject({
        method: 'POST',
        url: `/stop?id=${id}`,
        payload: { timeout: 1000 }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 200 with timeout', (done) => {
      server.inject({
        method: 'POST',
        url: `/stop?id=${id}`,
        payload: { timeout: 1000 }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'POST',
        url: '/stop'
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
        payload: { timeout: 1000 }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 200 with timeout', (done) => {
      server.inject({
        method: 'POST',
        url: `/kill?id=${id}`,
        payload: { timeout: 1000 }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'POST',
        url: '/kill'
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
        url: `/pid?id=${id}`
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'GET',
        url: '/pid'
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
        url: `/config?id=${id}`
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'GET',
        url: '/config'
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
        payload: { key: 'foo', value: 'bar' }
      }, (res) => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })

    it('should return 400', (done) => {
      server.inject({
        method: 'PUT',
        url: '/config'
      }, (res) => {
        expect(res.statusCode).to.equal(400)
        done()
      })
    })
  })
})
