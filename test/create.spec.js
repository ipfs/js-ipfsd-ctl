/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { isNode, isBrowser, isWebWorker } = require('ipfs-utils/src/env')
const { createFactory, createController, createServer } = require('../src')
const Client = require('../src/ipfsd-client')
const Daemon = require('../src/ipfsd-daemon')
const Proc = require('../src/ipfsd-in-proc')

/**
 * @typedef {import('../src/types').ControllerOptions} ControllerOptions
 */

describe('`createController` should return the correct class', () => {
  it('for type `js` ', async () => {
    const f = await createController({
      type: 'js',
      disposable: false,
      ipfsModule: require('ipfs'),
      ipfsHttpModule: require('ipfs-http-client'),
      ipfsBin: isNode ? require('ipfs').path() : undefined
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
      ipfsHttpModule: require('ipfs-http-client'),
      // @ts-expect-error no types
      ipfsBin: isNode ? require('go-ipfs').path() : undefined
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
      ipfsModule: require('ipfs'),
      ipfsHttpModule: require('ipfs-http-client'),
      ipfsBin: isNode ? require('ipfs').path() : undefined
    })

    expect(f).to.be.instanceOf(Client)
  })

  it.skip('should use ipfs-client if passed', async () => {
    let clientCreated = false
    let httpCreated = false

    await createController({
      type: 'js',
      disposable: false,
      ipfsModule: require('ipfs'),
      ipfsClientModule: {
        /**
         * @param {any} opts
         */
        create: (opts) => {
          clientCreated = true

          return require('ipfs-client').create(opts)
        }
      },
      ipfsHttpModule: {
        /**
         * @param {any} opts
         */
        create: (opts) => {
          httpCreated = true

          return require('ipfs-http-client').create(opts)
        }
      },
      ipfsBin: isNode ? require('ipfs').path() : undefined
    })

    expect(clientCreated).to.be.true()
    expect(httpCreated).to.be.false()
  })

  it.skip('should use ipfs-client for remote if passed', async () => {
    let clientCreated = false
    let httpCreated = false

    const f = await createController({
      remote: true,
      disposable: false,
      ipfsModule: require('ipfs'),
      ipfsClientModule: {
        /**
         * @param {any} opts
         */
        create: (opts) => {
          clientCreated = true

          return require('ipfs-client').create(opts)
        }
      },
      ipfsHttpModule: {
        /**
         * @param {any} opts
         */
        create: (opts) => {
          httpCreated = true

          return require('ipfs-http-client').create(opts)
        }
      },
      ipfsBin: isNode ? require('ipfs').path() : undefined
    })

    expect(f).to.be.instanceOf(Client)
    expect(clientCreated).to.be.true()
    expect(httpCreated).to.be.false()
  })
})

const defaultOps = {
  ipfsHttpModule: require('ipfs-http-client')
}

/** @type {ControllerOptions[]} */
const types = [{
  ...defaultOps,
  type: 'js',
  test: true,
  ipfsModule: require('ipfs'),
  ipfsBin: isNode ? require('ipfs').path() : undefined
}, {
  ...defaultOps,
  // @ts-ignore no types - TODO: remove when https://github.com/ipfs/npm-go-ipfs/pull/41 is released
  ipfsBin: isNode ? require('go-ipfs').path() : undefined,
  type: 'go',
  test: true
}, {
  ...defaultOps,
  type: 'proc',
  test: true,
  ipfsModule: require('ipfs')
}, {
  ...defaultOps,
  type: 'js',
  test: true,
  remote: true,
  ipfsModule: require('ipfs'),
  ipfsBin: isNode ? require('ipfs').path() : undefined
}, {
  ...defaultOps,
  // @ts-ignore no types - TODO: remove when https://github.com/ipfs/npm-go-ipfs/pull/41 is released
  ipfsBin: isNode ? require('go-ipfs').path() : undefined,
  type: 'go',
  test: true,
  remote: true
}]

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
