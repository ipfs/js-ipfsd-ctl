/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { isNode, isBrowser, isWebWorker } from 'wherearewe'
import { createFactory, createController, createServer } from '../src/index.js'
import Client from '../src/ipfsd-client.js'
import Daemon from '../src/ipfsd-daemon.js'
import Proc from '../src/ipfsd-in-proc.js'
import * as ipfsModule from 'ipfs'
import * as ipfsHttpModule from 'ipfs-http-client'
// @ts-ignore no types
import * as goIpfsModule from 'go-ipfs'
import * as ipfsClientModule from 'ipfs-client'

/**
 * @typedef {import('../src/types').ControllerOptions} ControllerOptions
 */

describe('`createController` should return the correct class', async () => {
  it('for type `js` ', async () => {
    const f = await createController({
      type: 'js',
      disposable: false,
      ipfsModule,
      ipfsHttpModule,
      ipfsBin: isNode ? ipfsModule.path() : undefined
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
      ipfsHttpModule,
      ipfsBin: isNode ? goIpfsModule.path() : undefined
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
      ipfsModule,
      ipfsHttpModule,
      ipfsBin: isNode ? ipfsModule.path() : undefined
    })

    expect(f).to.be.instanceOf(Client)
  })

  it.skip('should use ipfs-client if passed', async () => {
    let clientCreated = false
    let httpCreated = false

    await createController({
      type: 'js',
      disposable: false,
      ipfsModule,
      ipfsClientModule: {
        /**
         * @param {any} opts
         */
        create: (opts) => {
          clientCreated = true

          return ipfsClientModule.create(opts)
        }
      },
      ipfsHttpModule: {
        /**
         * @param {any} opts
         */
        create: async (opts) => {
          httpCreated = true

          return ipfsHttpModule.create(opts)
        }
      },
      ipfsBin: isNode ? ipfsModule.path() : undefined
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
      ipfsModule,
      ipfsClientModule: {
        /**
         * @param {any} opts
         */
        create: (opts) => {
          clientCreated = true

          return ipfsClientModule.create(opts)
        }
      },
      ipfsHttpModule: {
        /**
         * @param {any} opts
         */
        create: async (opts) => {
          httpCreated = true

          return ipfsHttpModule.create(opts)
        }
      },
      ipfsBin: isNode ? ipfsModule.path() : undefined
    })

    expect(f).to.be.instanceOf(Client)
    expect(clientCreated).to.be.true()
    expect(httpCreated).to.be.false()
  })
})

const defaultOps = {
  ipfsHttpModule
}

/** @type {ControllerOptions[]} */
const types = [{
  ...defaultOps,
  type: 'js',
  test: true,
  ipfsModule,
  ipfsBin: isNode ? ipfsModule.path() : undefined
}, {
  ...defaultOps,
  ipfsBin: isNode ? goIpfsModule.path() : undefined,
  type: 'go',
  test: true
}, {
  ...defaultOps,
  type: 'proc',
  test: true,
  ipfsModule
}, {
  ...defaultOps,
  type: 'js',
  test: true,
  remote: true,
  ipfsModule,
  ipfsBin: isNode ? ipfsModule.path() : undefined
}, {
  ...defaultOps,
  ipfsBin: isNode ? goIpfsModule.path() : undefined,
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
