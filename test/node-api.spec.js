/* eslint-env mocha */
'use strict'

const chai = require('chai')
const merge = require('merge-options')
const dirtyChai = require('dirty-chai')
const chaiPromise = require('chai-as-promised')
const { create, createTestsInterface, createTestsNode } = require('../src')
const { repoExists } = require('../src/utils')
const { isBrowser, isWebWorker } = require('ipfs-utils/src/env')
const testConfig = require('../src/config')

const expect = chai.expect
chai.use(dirtyChai)
chai.use(chaiPromise)

const types = [
  { type: 'js', ipfsOptions: { init: false, start: false } },
  { type: 'go', ipfsOptions: { init: false, start: false } },
  { type: 'proc', ipfsOptions: { init: false, start: false } },
  { type: 'js', remote: true, ipfsOptions: { init: false, start: false } },
  { type: 'go', remote: true, ipfsOptions: { init: false, start: false } }
]

describe('Node API', () => {
  describe('init', () => {
    const setup = createTestsInterface()

    before(() => setup.setup())

    after(() => setup.teardown())

    describe('should work with defaults', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await createTestsNode(opts)

          await node.init()
          expect(node.initialized).to.be.true()
          expect(node.clean).to.be.false()
          expect(node.started).to.be.false()
          if (!(isBrowser || isWebWorker) || opts.type === 'proc') {
            expect(await repoExists(node.path)).to.be.true()
          }
          await node.stop()
        })
      }
    })

    describe('should work with a initialized repo', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const f = create(opts)
          const node = await f.spawn({ config: testConfig(opts), repo: setup.nodes[0].path })

          await node.init()
          expect(node.initialized).to.be.true()
          expect(node.clean).to.be.false()
          expect(node.started).to.be.false()
          if (!(isBrowser || isWebWorker) || opts.type === 'proc') {
            expect(await repoExists(setup.nodes[0].path)).to.be.true()
          }
          await node.stop()
        })
      }
    })

    describe('should work with all the options', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const f = create(opts)
          const node = await f.spawn({ repo: await f.tmpDir() })

          if (opts.type === 'js') {
            await expect(node.init({
              emptyRepo: true,
              bits: 1024,
              profile: ['test'],
              pass: 'QmfPjo1bKmpcdWxpQnGAKjeae9F9aCxTDiS61t9a3hmvRi'
            })).to.be.fulfilled()
          } else {
            await expect(node.init({
              emptyRepo: true,
              bits: 1024,
              profile: ['test']
            })).to.be.fulfilled()
          }
          await node.stop()
        })
      }
    })

    describe('should apply config', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await createTestsNode(
            {
              ...opts,
              ipfsOptions: {
                config: {
                  Addresses: {
                    API: '/ip4/127.0.0.1/tcp/1111'
                  }
                }
              }
            }
          )
          await node.init()
          await node.start()
          const config = await node.api.config.get('Addresses.API')
          expect(config).to.be.eq('/ip4/127.0.0.1/tcp/1111')
          await node.stop()
        })
      }
    })
  })

  describe('start', () => {
    const setup = createTestsInterface()

    before(() => setup.setup())

    after(() => setup.teardown())

    describe('should work with defaults', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await createTestsNode(opts)

          await node.init()
          await node.start()
          expect(node.started).to.be.true()
          await node.stop()
        })
      }
    })

    describe('should attach to a running node', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async function () {
          if ((isBrowser || isWebWorker) && opts.type === 'proc') {
            return this.skip() // browser in proc can't attach to running node
          }
          const node = await createTestsNode(merge(
            opts,
            { ipfsOptions: { repo: setup.nodes[0].path } }
          ))

          await node.init()
          await node.start()
          expect(node.started).to.be.true()
          expect(setup.nodes[0].api.peerId).to.be.deep.eq(await node.api.id())
        })
      }
    })
  })

  describe('cleanup', () => {
    describe('should delete the repo', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await createTestsNode(opts)

          await node.init()
          await node.start()
          expect(node.started).to.be.true()
          await node.stop()
          await node.cleanup()
          if (!(isBrowser || isWebWorker) || opts.type === 'proc') {
            expect(await repoExists(node.path)).to.be.false()
          }
          expect(node.clean).to.be.true()
        })
      }
    })
  })

  describe('stop', () => {
    describe('should stop the node', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await createTestsNode(opts)

          await node.init()
          await node.start()
          await node.stop()
          expect(node.started).to.be.false()
        })
      }
    })

    describe('should not clean with disposable false', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const f = create({ ...opts, disposable: false })
          const node = await f.spawn({
            config: testConfig(opts),
            repo: await f.tmpDir()
          })

          await node.init()
          await node.start()
          await node.stop()
          expect(node.started).to.be.false()
          expect(node.clean).to.be.false()
        })
      }
    })

    describe('should clean with disposable true', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await createTestsNode(opts)

          await node.stop()
          expect(node.started).to.be.false()
          expect(node.clean).to.be.true()
        })
      }
    })

    describe('should clean listeners', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const node = await createTestsNode(opts)

          await node.stop()
          if (node.subprocess) {
            expect(node.subprocess.stderr.listeners('data')).to.be.empty()
            expect(node.subprocess.stdout.listeners('data')).to.be.empty()
          }
        })
      }
    })
  })
  describe('pid should return pid', () => {
    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        const node = await createTestsNode(opts)
        await node.init()
        await node.start()
        if (opts.type !== 'proc') {
          const pid = await node.pid()
          expect(typeof pid === 'number').to.be.true()
        }
        await node.stop()
      })
    }
  })
})
