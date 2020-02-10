/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const { isNode, isBrowser, isWebWorker } = require('ipfs-utils/src/env')
const { createFactory, createController, createServer } = require('../src')
const Client = require('../src/ipfsd-client')
const Daemon = require('../src/ipfsd-daemon')
const Proc = require('../src/ipfsd-in-proc')
const { findBin } = require('../src/utils')

const expect = chai.expect
chai.use(dirtyChai)

describe('`createController` should return the correct class', () => {
  it('for type `js` ', async () => {
    const f = await createController({
      type: 'js',
      disposable: false,
      ipfsModule: {
        path: require.resolve('ipfs'),
        ref: require('ipfs')
      },
      ipfsHttpModule: {
        path: require.resolve('ipfs-http-client'),
        ref: require('ipfs-http-client')
      },
      ipfsBin: findBin('js', true)
    })

    if (!isNode) {
      expect(f).to.be.instanceOf(Client)
    } else {
      expect(f).to.be.instanceOf(Daemon)
    }
  })
  it('for type `go` ', async () => {
    const f = await createController({
      type: 'go',
      disposable: false,
      ipfsHttpModule: {
        path: require.resolve('ipfs-http-client'),
        ref: require('ipfs-http-client')
      },
      ipfsBin: findBin('go', true)
    })

    if (!isNode) {
      expect(f).to.be.instanceOf(Client)
    } else {
      expect(f).to.be.instanceOf(Daemon)
    }
  })
  it('for type `proc` ', async () => {
    const f = await createController({ type: 'proc', disposable: false })

    expect(f).to.be.instanceOf(Proc)
  })

  it('for remote', async () => {
    const f = await createController({
      remote: true,
      disposable: false,
      ipfsModule: {
        path: require.resolve('ipfs'),
        ref: require('ipfs')
      },
      ipfsHttpModule: {
        path: require.resolve('ipfs-http-client'),
        ref: require('ipfs-http-client')
      },
      ipfsBin: findBin('js', true)
    })

    expect(f).to.be.instanceOf(Client)
  })
})

const defaultOps = {
  ipfsModule: {
    path: require.resolve('ipfs'),
    ref: require('ipfs')
  },
  ipfsHttpModule: {
    path: require.resolve('ipfs-http-client'),
    ref: require('ipfs-http-client')
  },
  ipfsBin: findBin('js', true)
}

const types = [{
  ...defaultOps,
  type: 'js',
  test: true
}, {
  ...defaultOps,
  ipfsBin: findBin('go', true),
  type: 'go',
  test: true
}, {
  ...defaultOps,
  type: 'proc',
  test: true
}, {
  ...defaultOps,
  type: 'js',
  test: true,
  remote: true
}, {
  ...defaultOps,
  ipfsBin: findBin('go', true),
  type: 'go',
  test: true,
  remote: true
}]

describe('`createController` should return daemon with peerId when started', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const node = await createController(opts)
      expect(node.api.peerId).to.exist()
      await node.stop()
    })
  }
})

describe('`createController({test: true})` should return daemon with test profile', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const node = await createController(opts)
      expect(await node.api.config.get('Bootstrap')).to.be.empty()
      await node.stop()
    })
  }
})

describe('`createController({test: true})` should return daemon with correct config', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const node = await createController(opts)
      const swarm = await node.api.config.get('Addresses.Swarm')

      if ((isBrowser || isWebWorker) && opts.type !== 'proc') {
        expect(swarm).to.be.deep.eq(['/ip4/127.0.0.1/tcp/0/ws'])
      } else if ((isBrowser || isWebWorker) && opts.type === 'proc') {
        expect(swarm).to.be.deep.eq([])
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

describe('`createFactory({test: true})` should return daemon with test profile', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const factory = createFactory({
        test: true
      })
      const node = await factory.spawn(opts)
      expect(await node.api.config.get('Bootstrap')).to.be.empty()
      await factory.clean()
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
