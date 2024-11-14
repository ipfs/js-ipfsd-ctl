/* eslint-env mocha */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-loop-func */

import { expect } from 'aegir/chai'
import * as kubo from 'kubo'
import { create as createKuboRPCClient } from 'kubo-rpc-client'
import merge from 'merge-options'
import { isBrowser, isWebWorker, isNode, isElectronMain } from 'wherearewe'
import { createFactory } from '../src/index.js'
import { repoExists } from '../src/kubo/utils.js'
import type { Factory, KuboOptions, SpawnOptions, KuboNode } from '../src/index.js'

const types: Array<KuboOptions & SpawnOptions> = [{
  type: 'kubo'
}, {
  type: 'kubo',
  remote: true
}]

describe('Node API', function () {
  this.timeout(60000)

  let factory: Factory<KuboNode>

  before(async () => {
    factory = createFactory({
      type: 'kubo',
      test: true,
      bin: isNode || isElectronMain ? kubo.path() : undefined,
      rpc: createKuboRPCClient,
      disposable: true
    })

    await factory.spawn({ type: 'kubo' })
  })

  afterEach(async () => {
    await factory.clean()
  })

  describe('init', () => {
    describe('should work with defaults', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await factory.spawn(opts)

          if (!(isBrowser || isWebWorker)) {
            const info = await node.info()
            await expect(repoExists(info.repo)).to.eventually.be.true()
          }
        })
      }
    })

    describe('should work with a initialized repo', () => {
      for (const opts of types) {
        let repo: string

        beforeEach(async () => {
          const existingNode = await factory.spawn({
            disposable: false
          })
          const existingNodeInfo = await existingNode.info()
          await existingNode.stop()

          if (!(isBrowser || isWebWorker)) {
            await expect(repoExists(existingNodeInfo.repo)).to.eventually.be.true()
          }

          repo = existingNodeInfo.repo
        })

        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await factory.spawn(merge(opts, {
            repo,
            init: false
          }))

          if (!(isBrowser || isWebWorker)) {
            const info = await node.info()
            await expect(repoExists(info.repo)).to.eventually.be.true()
          }
        })
      }
    })

    describe('should apply config', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await factory.spawn(merge(opts, {
            init: {
              config: {
                Addresses: {
                  API: '/ip4/127.0.0.1/tcp/1111'
                }
              }
            },
            start: true
          }))

          const config = await node.api.config.get('Addresses.API')
          expect(config).to.be.eq('/ip4/127.0.0.1/tcp/1111')
          await node.stop()
        })
      }
    })

    describe('should return version in info', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await factory.spawn(opts)
          const info = await node.info()

          expect(info.version).to.be.a('string')
          await node.stop()
        })
      }
    })

    describe('should return pid in info', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await factory.spawn(opts)
          const info = await node.info()

          expect(info.pid).to.be.a('number')
          await node.stop()
        })
      }
    })
  })

  describe('start', () => {
    describe('should work with defaults', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(opts)

          await expect(ctl.api.isOnline()).to.eventually.be.true()
          await ctl.stop()
        })
      }
    })
  })

  describe('cleanup', () => {
    describe('should delete the repo', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await factory.spawn(opts)
          const info = await node.info()

          await node.stop()
          await node.cleanup()

          if (!(isBrowser || isWebWorker)) {
            expect(await repoExists(info.repo)).to.be.false()
          }
        })
      }
    })
  })

  describe('stop', () => {
    describe('should stop the node', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await factory.spawn(opts)

          await node.stop()
          await expect(node.api.isOnline()).to.eventually.be.false()
        })
      }
    })

    describe('should not clean with disposable false', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await factory.spawn(merge(opts, {
            disposable: false
          }))
          const info = await node.info()

          await node.stop()

          if (!(isBrowser || isWebWorker)) {
            expect(await repoExists(info.repo)).to.be.true()
          }
        })
      }
    })

    describe('should clean with disposable true', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await factory.spawn(merge(opts, {
            disposable: true
          }))
          const info = await node.info()

          await node.stop()

          if (!(isBrowser || isWebWorker)) {
            expect(await repoExists(info.repo)).to.be.false()
          }
        })
      }
    })
  })

  describe('info', () => {
    describe('should return the node info', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await factory.spawn(opts)
          const info = await node.info()

          expect(info).to.have.property('version').that.is.a('string')
          expect(info).to.have.property('api').that.is.a('string')
          expect(info).to.have.property('peerId').that.is.a('string')
          expect(info).to.have.property('repo').that.is.a('string')
          expect(info).to.have.property('pid').that.is.a('number')
          expect(info).to.have.property('multiaddrs').that.is.an('array')
          expect(info).to.have.property('gateway').that.is.a('string').that.matches(/\/ip4\/127\.0\.0\.1\/tcp\/\d+/)

          await node.stop()
        })
      }
    })
  })
})
