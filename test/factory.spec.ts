/* eslint-disable no-loop-func */
/* eslint-env mocha */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { expect } from 'aegir/chai'
import * as kubo from 'kubo'
import { create as createKuboRPCClient } from 'kubo-rpc-client'
import { isNode } from 'wherearewe'
import { createFactory } from '../src/index.js'
import type { Factory, KuboOptions, SpawnOptions } from '../src/index.js'

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

describe('`Factory spawn()` ', function () {
  this.timeout(60000)

  describe('should return a node with api', () => {
    let factory: Factory

    afterEach(async () => {
      await factory?.clean()
    })

    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        factory = createFactory()
        const node = await factory.spawn(opts)
        expect(node).to.exist()
        expect(node.api).to.exist()
        expect(node.api.id).to.exist()
        await node.stop()
      })
    }
  })

  describe('should return node for tests when factory initialized with test === true', () => {
    let factory: Factory

    afterEach(async () => {
      await factory?.clean()
    })

    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        factory = createFactory({ test: true })
        const node = await factory.spawn({
          type: opts.type,
          remote: opts.remote,
          rpc: createKuboRPCClient,
          bin: isNode ? kubo.path() : undefined
        })
        expect(node).to.exist()
        expect(node.options.test).to.be.true()
        await node.stop()
      })
    }
  })

  describe('should return a disposable node by default', () => {
    let factory: Factory

    afterEach(async () => {
      await factory?.clean()
    })

    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        factory = createFactory()
        const node = await factory.spawn({
          ...opts,
          disposable: undefined
        })
        await node.stop()
        expect(node.options.disposable).to.be.true()
      })
    }
  })

  describe('should return a non disposable node', () => {
    let factory: Factory

    afterEach(async () => {
      await factory?.clean()
    })

    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        factory = createFactory()
        const node = await factory.spawn({
          ...opts,
          disposable: false
        })
        await node.stop()
        expect(node.options.disposable).to.be.false()
      })
    }
  })

  describe('`Factory.clean()` should stop all nodes', () => {
    let factory: Factory

    afterEach(async () => {
      await factory?.clean()
    })

    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        factory = createFactory(opts)
        const node1 = await factory.spawn(opts)
        const node2 = await factory.spawn(opts)
        await factory.clean()
        await expect(node1.api.isOnline()).to.eventually.be.false()
        await expect(node2.api.isOnline()).to.eventually.be.false()
      })
    }
  })

  describe('`Factory.clean()` should not error when controller already stopped', () => {
    let factory: Factory

    afterEach(async () => {
      await factory?.clean()
    })

    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        factory = createFactory(opts)
        const node1 = await factory.spawn(opts)
        const node2 = await factory.spawn(opts)
        await node2.stop()
        await factory.clean()
        await expect(node1.api.isOnline()).to.eventually.be.false()
        await expect(node2.api.isOnline()).to.eventually.be.false()
      })
    }
  })
})
