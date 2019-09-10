/* eslint max-nested-callbacks: ["error", 6] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const hat = require('hat')

const boom = require('@hapi/boom')
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

      it('should handle valid request', async () => {
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

        const ipfsd = await client.spawn({ opt1: 'hello!' })
        expect(ipfsd).to.exist()
        expect(ipfsd.apiAddr.toString()).to.equal('/ip4/127.0.0.1/tcp/5001')
        expect(ipfsd.gatewayAddr.toString()).to.equal('/ip4/127.0.0.1/tcp/8080')
        node = ipfsd
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
        const badReq = boom.badRequest()

        mock.post('http://localhost:9999/spawn', () => {
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        try {
          await client.spawn()
          expect.fail('Should have thrown')
        } catch (err) {
          expect(err.response.body.message).to.equal(badReq.message)
        }
      })
    })
  })

  describe('.init', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
        mock.post('http://localhost:9999/init', (req) => {
          expect(req.query.id).to.exist()

          return {
            body: {
              initialized: true
            }
          }
        })

        await node.init({ bits: 512 })
        expect(node.initialized).to.be.ok()
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
        const badReq = boom.badRequest()

        mock.post('http://localhost:9999/init', () => {
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        try {
          await node.init()
          expect.fail('Should have thrown')
        } catch (err) {
          expect(err.response.body.message).to.equal(badReq.message)
        }
      })
    })
  })

  describe('.cleanup', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
        mock.post('http://localhost:9999/cleanup', (req) => {
          expect(req.query.id).to.exist()
        })

        await node.cleanup()
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', async () => {
        const badReq = boom.badRequest()

        mock.post('http://localhost:9999/cleanup', () => {
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        try {
          await node.cleanup()
          expect.fail('Should have errored')
        } catch (err) {
          expect(err.response.body.message).to.equal(badReq.message)
        }
      })
    })
  })

  describe('.start', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
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

        const api = await node.start(['--enable-pubsub-experiment'])
        expect(api).to.exist()
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', async () => {
        const badReq = boom.badRequest()

        mock.post('http://localhost:9999/start', () => {
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        try {
          await node.start()
          expect.fail('Should have errored')
        } catch (err) {
          expect(err.response.body.message).to.equal(badReq.message)
        }
      })
    })
  })

  describe('.stop', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
        mock.post('http://localhost:9999/stop', (req) => {
          expect(req.query.id).to.exist()
        })

        await node.stop()
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', async () => {
        const badReq = boom.badRequest()

        mock.post('http://localhost:9999/stop', () => {
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        try {
          await node.stop()
          expect.fail('Should have errored')
        } catch (err) {
          expect(err.response.body.message).to.equal(badReq.message)
        }
      })
    })
  })

  describe('.stop with timeout', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
        mock.post('http://localhost:9999/stop', (req) => {
          expect(req.query.id).to.exist()
        })

        await node.stop(1000)
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', async () => {
        const badReq = boom.badRequest()

        mock.post('http://localhost:9999/stop', () => {
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        try {
          await node.stop(1000)
          expect.fail('Should have errored')
        } catch (err) {
          expect(err.response.body.message).to.equal(badReq.message)
        }
      })
    })
  })

  describe('.killProcess', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
        mock.post('http://localhost:9999/kill', (req) => {
          expect(req.query.id).to.exist()
        })

        await node.killProcess()
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', async () => {
        const badReq = boom.badRequest()

        mock.post('http://localhost:9999/kill', () => {
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        try {
          await node.killProcess()
          expect.fail('Should have errored')
        } catch (err) {
          expect(err.response.body.message).to.equal(badReq.message)
        }
      })
    })
  })

  describe('.pid', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
        mock.get('http://localhost:9999/pid', (req) => {
          expect(req.query.id).to.exist()
          return {
            body: {
              pid: 1
            }
          }
        })

        const res = await node.pid()
        expect(res).to.equal(1)
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', async () => {
        const badReq = boom.badRequest()

        mock.get('http://localhost:9999/pid', () => {
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        try {
          await node.pid()
          expect.fail('Should have errored')
        } catch (err) {
          expect(err.response.body.message).to.equal(badReq.message)
        }
      })
    })
  })

  describe('.getConfig', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
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

        const res = await node.getConfig('foo')
        expect(res.foo).to.equal('bar')
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', async () => {
        const badReq = boom.badRequest()

        mock.get('http://localhost:9999/config', () => {
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        try {
          await node.getConfig('foo')
          expect.fail('Should have errored')
        } catch (err) {
          expect(err.response.body.message).to.equal(badReq.message)
        }
      })
    })
  })

  describe('.setConfig', () => {
    describe('handle valid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle valid request', async () => {
        mock.put('http://localhost:9999/config', (req) => {
          expect(req.query.id).to.exist()
          expect(req.body.key).to.equal('foo')
          expect(req.body.value).to.equal('bar')
        })

        await node.setConfig('foo', 'bar')
      })
    })

    describe('handle invalid', () => {
      after(() => {
        mock.clearRoutes()
      })

      it('should handle invalid request', async () => {
        const badReq = boom.badRequest()

        mock.put('http://localhost:9999/config', () => {
          return {
            status: badReq.output.statusCode,
            body: {
              message: badReq.message
            }
          }
        })

        try {
          await node.setConfig('foo', 'bar')
          expect.fail('Should have errored')
        } catch (err) {
          expect(err.response.body.message).to.equal(badReq.message)
        }
      })
    })
  })
})
