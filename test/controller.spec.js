/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const merge = require('merge-options')
const { createFactory, createController } = require('../src')
const { repoExists } = require('../src/utils')
const { isBrowser, isWebWorker, isNode } = require('ipfs-utils/src/env')
const pathJoin = require('ipfs-utils/src/path-join')
const retry = require('trytryagain')

/** @typedef {import("../src/index").ControllerOptions} ControllerOptions */

const types = [{
  type: 'js',
  ipfsOptions: {
    init: false,
    start: false
  }
}, {
  type: 'go',
  ipfsOptions: {
    init: false,
    start: false
  }
}, {
  type: 'proc',
  ipfsOptions: {
    init: false,
    start: false
  }
}, {
  type: 'js',
  remote: true,
  ipfsOptions: {
    init: false,
    start: false
  }
}, {
  type: 'go',
  remote: true,
  ipfsOptions: {
    init: false,
    start: false
  }
}]

describe('Controller API', function () {
  this.timeout(60000)

  const factory = createFactory({
    test: true,
    ipfsHttpModule: require('ipfs-http-client'),
    ipfsModule: require('ipfs')
  }, {
    js: {
      ipfsBin: pathJoin(__dirname, '../node_modules/ipfs/src/cli/bin.js')
    },
    go: {
      ipfsBin: isNode ? require('go-ipfs').path() : undefined
    }
  })

  before(() => factory.spawn({ type: 'js' }))

  after(() => factory.clean())

  describe('init', () => {
    describe('should work with defaults', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(opts)

          await ctl.init()
          expect(ctl.initialized).to.be.true()
          expect(ctl.clean).to.be.false()
          expect(ctl.started).to.be.false()
          if (!(isBrowser || isWebWorker) || opts.type === 'proc') {
            expect(await repoExists(ctl.path)).to.be.true()
          }
        })
      }
    })

    describe('should work with a initialized repo', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(merge(opts, {
            ipfsOptions: {
              repo: factory.controllers[0].path,
              init: false
            }
          }))

          await ctl.init()
          expect(ctl.initialized).to.be.true()
          expect(ctl.clean).to.be.false()
          expect(ctl.started).to.be.false()
          if (!(isBrowser || isWebWorker) || opts.type === 'proc') {
            expect(await repoExists(factory.controllers[0].path)).to.be.true()
          }
        })
      }
    })

    describe('should work with all the options', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(opts)

          if (opts.type === 'js') {
            await expect(ctl.init({
              emptyRepo: true,
              profile: ['test'],
              pass: 'QmfPjo1bKmpcdWxpQnGAKjeae9F9aCxTDiS61t9a3hmvRi'
            })).to.be.fulfilled()
          } else {
            await expect(ctl.init({
              emptyRepo: true,
              profile: ['test']
            })).to.be.fulfilled()
          }
        })
      }
    })

    describe('should apply config', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(merge(
            opts,
            {
              ipfsOptions: {
                config: {
                  Addresses: {
                    API: '/ip4/127.0.0.1/tcp/1111'
                  }
                }
              }
            }
          ))
          await ctl.init()
          await ctl.start()
          const config = await ctl.api.config.get('Addresses.API')
          expect(config).to.be.eq('/ip4/127.0.0.1/tcp/1111')
          await ctl.stop()
        })
      }
    })
  })

  describe('start', () => {
    describe('should work with defaults', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(opts)

          await ctl.init()
          await ctl.start()
          expect(ctl.started).to.be.true()
          await ctl.stop()
        })
      }
    })

    describe('should attach to a running node', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async function () {
          if ((isBrowser || isWebWorker) && opts.type === 'proc') {
            return this.skip() // browser in proc can't attach to running node
          }

          // have to use createController so we don't try to shut down
          // the node twice during test cleanup
          const ctl = await createController(merge(
            opts, {
              ipfsHttpModule: require('ipfs-http-client'),
              ipfsModule: require('ipfs'),
              ipfsOptions: {
                repo: factory.controllers[0].path
              }
            }
          ))

          await ctl.init()
          await ctl.start()
          expect(ctl.started).to.be.true()
          const id = await ctl.api.id()
          expect(factory.controllers[0].api.peerId.id).to.be.eq(id.id)
        })
      }
    })

    describe('should stop a running node that we have joined', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async function () {
          if (isBrowser || isWebWorker) {
            return this.skip() // can't detect remote node shutdown in the browser
          }

          // have to use createController so we don't try to shut down
          // the node twice during test cleanup
          const ctl1 = await createController({
            type: 'go',
            ipfsHttpModule: require('ipfs-http-client'),
            ipfsBin: isNode ? require('go-ipfs').path() : undefined,
            test: true,
            disposable: true,
            ipfsOptions: {
              init: true,
              start: true
            }
          })
          expect(ctl1.started).to.be.true()

          const ctl2 = await createController(merge(
            opts, {
              ipfsHttpModule: require('ipfs-http-client'),
              ipfsModule: require('ipfs'),
              ipfsOptions: {
                repo: ctl1.path,
                start: true
              }
            }
          ))
          expect(ctl2.started).to.be.true()

          await ctl2.stop()
          expect(ctl2.started).to.be.false()

          // wait for the other subprocess to exit
          await retry(() => ctl1.started ? Promise.reject(new Error('Still running')) : Promise.resolve(), { // eslint-disable-line max-nested-callbacks
            timeout: 10000,
            interval: 100
          })

          expect(ctl1.started).to.be.false()
        })
      }
    })
  })

  describe('cleanup', () => {
    describe('should delete the repo', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(opts)

          await ctl.init()
          await ctl.start()
          expect(ctl.started).to.be.true()
          await ctl.stop()
          await ctl.cleanup()
          if (!(isBrowser || isWebWorker) || opts.type === 'proc') {
            expect(await repoExists(ctl.path)).to.be.false()
          }
          expect(ctl.clean).to.be.true()
        })
      }
    })
  })

  describe('stop', () => {
    describe('should stop the node', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(opts)

          await ctl.init()
          await ctl.start()
          await ctl.stop()
          expect(ctl.started).to.be.false()
        })
      }
    })

    describe('should not clean with disposable false', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(merge(opts, {
            disposable: false,
            test: true,
            ipfsOptions: {
              repo: await factory.tmpDir()
            }
          }))

          await ctl.init()
          await ctl.start()
          await ctl.stop()
          expect(ctl.started).to.be.false()
          expect(ctl.clean).to.be.false()
        })
      }
    })

    describe('should clean with disposable true', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(opts)
          await ctl.init()
          await ctl.start()
          await ctl.stop()
          expect(ctl.started).to.be.false()
          expect(ctl.clean).to.be.true()
        })
      }
    })

    describe('should clean listeners', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(opts)
          await ctl.init()
          await ctl.start()
          await ctl.stop()
          if (ctl.subprocess) {
            expect(ctl.subprocess.stderr.listeners('data')).to.be.empty()
            expect(ctl.subprocess.stdout.listeners('data')).to.be.empty()
          }
        })
      }
    })
  })
  describe('pid should return pid', () => {
    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        const ctl = await factory.spawn(opts)
        await ctl.init()
        await ctl.start()
        if (opts.type !== 'proc') {
          const pid = await ctl.pid()
          expect(typeof pid === 'number').to.be.true()
        }
        await ctl.stop()
      })
    }
  })
})
