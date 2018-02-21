/* eslint max-nested-callbacks: ["error", 6] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const hat = require('hat')

const boom = require('boom')
const proxyquire = require('proxyquire')
const superagent = require('superagent')
const mock = require('superagent-mocker')(superagent)

const ClientFactory = proxyquire('../../src/factory-client', {
  superagent: () => {
    return superagent
  }
})

describe('client', () => {
  const client = new ClientFactory()

  let node = null
  describe('.spawn', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.post('http://localhost:9999/spawn', (req) => {
          expect(req.body.options.opt1).to.equal('hello!')
          return {
            body: {
              id: hat(),
              api: {
                apiAddr: '/ip4/127.0.0.1/tcp/5001',
                gatewayAddr: '/ip4/127.0.0.1/tcp/8080'
              }
            }
          }
        })

        client.spawn({ opt1: 'hello!' }, (err, ipfsd) => {
          expect(err).to.not.exist()
          expect(ipfsd).to.exist()
          expect(ipfsd.apiAddr.toString()).to.equal('/ip4/127.0.0.1/tcp/5001')
          expect(ipfsd.gatewayAddr.toString()).to.equal('/ip4/127.0.0.1/tcp/8080')
          node = ipfsd
          done()
        })
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.post('http://localhost:9999/spawn', () => {
          const badReq = boom.badRequest()
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        client.spawn((err, ipfsd) => {
          expect(err).to.exist()
          expect(ipfsd).to.not.exist()
          done()
        })
      })
    })
  })

  describe('.init', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.post('http://localhost:9999/init', (req) => {
          expect(req.query.id).to.exist()

          return {
            body: {
              initialized: true
            }
          }
        })

        node.init({ bits: 512 }, (err) => {
          expect(err).to.not.exist()
          expect(node.initialized).to.be.ok()
          done()
        })
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.post('http://localhost:9999/init', () => {
          const badReq = boom.badRequest()
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        node.init((err) => {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  describe('.cleanup', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.post('http://localhost:9999/cleanup', (req) => {
          expect(req.query.id).to.exist()
        })

        node.cleanup((err) => {
          expect(err).to.not.exist()
          done()
        })
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', (done) => {
        mock.post('http://localhost:9999/cleanup', () => {
          const badReq = boom.badRequest()
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        node.init((err) => {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  describe('.start', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.post('http://localhost:9999/start', (req) => {
          expect(req.query.id).to.exist()
          expect(req.body.flags).to.exist()
          expect(req.body.flags[0]).to.equal('--enable-pubsub-experiment')

          return {
            body: {
              api: {
                apiAddr: '/ip4/127.0.0.1/tcp/5001',
                gatewayAddr: '/ip4/127.0.0.1/tcp/8080'
              }
            }
          }
        })

        node.start(['--enable-pubsub-experiment'], (err, api) => {
          expect(err).to.not.exist()
          expect(api).to.exist()
          done()
        })
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', (done) => {
        mock.post('http://localhost:9999/start', () => {
          const badReq = boom.badRequest()
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        node.start((err) => {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  describe('.stop', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.post('http://localhost:9999/stop', (req) => {
          expect(req.query.id).to.exist()
        })

        node.stop((err) => {
          expect(err).to.not.exist()
          done()
        })
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', (done) => {
        mock.post('http://localhost:9999/stop', () => {
          const badReq = boom.badRequest()
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        node.stop((err) => {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  describe('.killProcess', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.post('http://localhost:9999/kill', (req) => {
          expect(req.query.id).to.exist()
        })

        node.killProcess((err) => {
          expect(err).to.not.exist()
          done()
        })
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', (done) => {
        mock.post('http://localhost:9999/kill', () => {
          const badReq = boom.badRequest()
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        node.killProcess((err) => {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  describe('.pid', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.get('http://localhost:9999/pid', (req) => {
          expect(req.query.id).to.exist()
          return {
            body: {
              pid: 1
            }
          }
        })

        node.pid((err, res) => {
          expect(err).to.not.exist()
          expect(res).to.equal(1)
          done()
        })
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', (done) => {
        mock.get('http://localhost:9999/pid', () => {
          const badReq = boom.badRequest()
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        node.pid((err) => {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  describe('.getConfig', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.get('http://localhost:9999/config', (req) => {
          expect(req.query.id).to.exist()
          expect(req.query.key).to.equal('foo')
          return {
            body: {
              config: {
                foo: 'bar'
              }
            }
          }
        })

        node.getConfig('foo', (err, res) => {
          expect(err).to.not.exist()
          expect(res.foo).to.equal('bar')
          done()
        })
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', (done) => {
        mock.get('http://localhost:9999/config', () => {
          const badReq = boom.badRequest()
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        node.getConfig((err) => {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  describe('.setConfig', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', (done) => {
        mock.put('http://localhost:9999/config', (req) => {
          expect(req.query.id).to.exist()
          expect(req.body.key).to.equal('foo')
          expect(req.body.value).to.equal('bar')
        })

        node.setConfig('foo', 'bar', (err) => {
          expect(err).to.not.exist()
          done()
        })
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', (done) => {
        mock.put('http://localhost:9999/config', () => {
          const badReq = boom.badRequest()
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        node.setConfig('foo', 'bar', (err) => {
          expect(err).to.exist()
          done()
        })
      })
    })
  })
})
