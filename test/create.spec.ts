/* eslint-disable no-loop-func */
/* eslint-env mocha */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { expect } from 'aegir/chai'
import * as kubo from 'kubo'
import { create as createKuboRPCClient } from 'kubo-rpc-client'
import { isNode, isElectronMain } from 'wherearewe'
import { createFactory, createController, createServer, type KuboOptions, type SpawnOptions, type KuboController, type Factory } from '../src/index.js'
import KuboClient from '../src/kubo/client.js'
import KuboDaemon from '../src/kubo/daemon.js'
import type Server from '../src/endpoint/server.js'

describe('`createController` should return the correct class', () => {
  let node: KuboController

  afterEach(async () => {
    await node?.stop()
  })

  it('for type `kubo` ', async () => {
    node = await createController({
      type: 'kubo',
      test: true,
      disposable: false,
      rpc: createKuboRPCClient,
      bin: isNode ? kubo.path() : undefined
    })

    if (!isNode && !isElectronMain) {
      expect(node).to.be.instanceOf(KuboClient)
    } else {
      expect(node).to.be.instanceOf(KuboDaemon)
    }
  })

  it('for remote', async () => {
    node = await createController({
      type: 'kubo',
      test: true,
      remote: true,
      disposable: false,
      rpc: createKuboRPCClient
    })

    expect(node).to.be.instanceOf(KuboClient)
  })
})

const types: Array<KuboOptions & SpawnOptions> = [{
  type: 'kubo',
  test: true,
  rpc: createKuboRPCClient,
  bin: isNode ? kubo.path() : undefined
}, {
  type: 'kubo',
  test: true,
  remote: true,
  rpc: createKuboRPCClient,
  bin: isNode ? kubo.path() : undefined
}]

describe('`createController({test: true})` should return daemon with test profile', () => {
  let node: KuboController

  afterEach(async () => {
    await node?.stop()
  })

  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      node = await createController(opts)
      expect(await node.api.config.get('Bootstrap')).to.be.empty()
      await node.stop()
    })
  }
})

describe('`createController({test: true})` should return daemon with correct config', () => {
  let node: KuboController

  afterEach(async () => {
    await node?.stop()
  })

  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      node = await createController(opts)
      const swarm = await node.api.config.get('Addresses.Swarm')

      expect(swarm).to.include('/ip4/127.0.0.1/tcp/0')
      expect(swarm).to.include('/ip4/127.0.0.1/tcp/0/ws')

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
  let factory: Factory

  afterEach(async () => {
    await factory.clean()
  })

  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      factory = createFactory({
        test: true
      })
      const node = await factory.spawn(opts)
      expect(await node.api.config.get('Bootstrap')).to.be.empty()
    })
  }
})

describe('`createServer`', () => {
  let server: Server

  afterEach(async () => {
    await server?.stop()
  })

  it('should return a Server with port 43134 by default', () => {
    server = createServer()
    expect(server.port).to.be.eq(43134)
  })
  it('should return a Server with port 11111 when passed number directly', () => {
    server = createServer(11111)
    expect(server.port).to.be.eq(11111)
  })
  it('should return a Server with port 22222 when passed {port: 22222}', () => {
    server = createServer({ port: 22222 })
    expect(server.port).to.be.eq(22222)
  })
})
