/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const { isBrowser, isWebWorker } = require('ipfs-utils/src/env')
const { createNode, createTestsNode, createTestsInterface, createServer } = require('../src')
const Client = require('../src/ipfsd-client')
const Daemon = require('../src/ipfsd-daemon')
const Proc = require('../src/ipfsd-in-proc')

const expect = chai.expect
chai.use(dirtyChai)

describe('`create` should return the correct class', () => {
  it('for type `js` ', async () => {
    const f = await createNode({ type: 'js', disposable: false })

    if (isBrowser || isWebWorker) {
      expect(f).to.be.instanceOf(Client)
    } else {
      expect(f).to.be.instanceOf(Daemon)
    }
  })
  it('for type `go` ', async () => {
    const f = await createNode({ type: 'go', disposable: false })

    if (isBrowser || isWebWorker) {
      expect(f).to.be.instanceOf(Client)
    } else {
      expect(f).to.be.instanceOf(Daemon)
    }
  })
  it('for type `proc` ', async () => {
    const f = await createNode({ type: 'proc', disposable: false })

    expect(f).to.be.instanceOf(Proc)
  })

  it('for remote', async () => {
    const f = await createNode({ remote: true, disposable: false })

    expect(f).to.be.instanceOf(Client)
  })
})

const types = [
  { type: 'js' },
  { type: 'go' },
  { type: 'proc' },
  { type: 'js', remote: true },
  { type: 'go', remote: true }
]

describe('`createNodeTests` should return daemon with peerId when started', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const node = await createTestsNode(opts)
      expect(node.api.peerId).to.exist()
      await node.stop()
    })
  }
})

describe('`createNodeTests` should return daemon with test profile', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const node = await createTestsNode(opts)
      expect(await node.api.config.get('Bootstrap')).to.be.empty()
      await node.stop()
    })
  }
})

describe('`createNodeTests` should return daemon with correct config', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const node = await createTestsNode(opts)
      const swarm = await node.api.config.get('Addresses.Swarm')

      if ((isBrowser || isWebWorker) && opts.type !== 'proc') {
        expect(swarm).to.be.deep.eq(['/ip4/127.0.0.1/tcp/0/ws'])
      } else {
        expect(swarm).to.be.deep.eq(['/ip4/127.0.0.1/tcp/0'])
      }

      const expectedAPI = {
        HTTPHeaders: {
          'Access-Control-Allow-Origin': ['*'],
          'Access-Control-Allow-Methods': [
            'PUT',
            'POST',
            'GET'
          ]
        }
      }
      expect(await node.api.config.get('API')).to.be.deep.eq(expectedAPI)
      await node.stop()
    })
  }
})

describe('`createTestsInterface.node()` should return daemon with test profile', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const tests = createTestsInterface(opts)
      const node = await tests.node()
      expect(await node.api.config.get('Bootstrap')).to.be.empty()
      await node.stop()
    })
  }
})

describe('`createTestsInterface.setup()` should return api with test profile', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const tests = createTestsInterface(opts)
      const api = await tests.setup()
      expect(await api.config.get('Bootstrap')).to.be.empty()
      await tests.teardown()
      expect(tests.nodes[0].started).to.be.false()
    })
  }
})

describe('`createTestsInterface.teardown()` should stop all nodes', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const tests = createTestsInterface(opts)
      await tests.setup()
      await tests.setup()
      await tests.teardown()
      expect(tests.nodes[0].started).to.be.false()
      expect(tests.nodes[1].started).to.be.false()
    })
  }
})

describe('`createServer`', () => {
  it('should return a Server with port 43134 by default', () => {
    const s = createServer()
    expect(s.port).to.be.eq(43134)
  })
  it('should return a Server with port 11111 when passed number directly', () => {
    const s = createServer(11111)
    expect(s.port).to.be.eq(11111)
  })
  it('should return a Server with port 22222 when passed {port: 22222}', () => {
    const s = createServer({ port: 22222 })
    expect(s.port).to.be.eq(22222)
  })
})
