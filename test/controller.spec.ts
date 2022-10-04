/* eslint-env mocha */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-loop-func */

import { expect } from 'aegir/chai'
import merge from 'merge-options'
import { createFactory, createController, ControllerOptions, Factory } from '../src/index.js'
import { repoExists } from '../src/utils.js'
import { isBrowser, isWebWorker, isNode } from 'wherearewe'
import waitFor from 'p-wait-for'
import * as ipfsModule from 'ipfs'
import * as ipfsHttpModule from 'ipfs-http-client'
// @ts-expect-error no types
import * as goIpfsModule from 'go-ipfs'

const types: ControllerOptions[] = [{
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

  let factory: Factory

  before(async () => {
    factory = createFactory({
      test: true,
      ipfsHttpModule,
      ipfsModule: (await import('ipfs'))
    }, {
      js: {
        ipfsBin: isNode ? ipfsModule.path() : undefined
      },
      go: {
        ipfsBin: isNode ? goIpfsModule.path() : undefined
      }
    })

    await factory.spawn({ type: 'js' })
  })

  after(async () => await factory.clean())

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
              profiles: ['test'],
              pass: 'QmfPjo1bKmpcdWxpQnGAKjeae9F9aCxTDiS61t9a3hmvRi'
            })).to.be.fulfilled()
          } else {
            await expect(ctl.init({
              emptyRepo: true,
              profiles: ['test']
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

    describe('should return a version', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
          const ctl = await factory.spawn(opts)

          const version = await ctl.version()

          expect(version).to.be.a('string')
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
              ipfsHttpModule,
              ipfsModule,
              ipfsOptions: {
                repo: factory.controllers[0].path
              }
            }
          ))

          await ctl.init()
          await ctl.start()
          expect(ctl.started).to.be.true()
        })
      }
    })

    describe('should stop a running node that we have joined', () => {
      for (const opts of types) {
        it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async function () {
          if (isBrowser || isWebWorker) {
            return this.skip() // browser can't attach to running node
          }

          // have to use createController so we don't try to shut down
          // the node twice during test cleanup
          const ctl1 = await createController(merge(
            {
              type: 'go',
              ipfsHttpModule,
              ipfsBin: goIpfsModule.path(),
              test: true,
              disposable: true,
              remote: false,
              ipfsOptions: {
                init: true,
                start: true
              }
            }))
          expect(ctl1.started).to.be.true()

          const ctl2 = await createController(merge(
            opts, {
              ipfsHttpModule,
              ipfsModule,
              test: true,
              disposable: true,
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
          await waitFor(() => !ctl1.started, { // eslint-disable-line max-nested-callbacks
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
          if (ctl.subprocess?.stderr != null) {
            expect(ctl.subprocess.stderr.listeners('data')).to.be.empty()
          }
          if (ctl.subprocess?.stdout != null) {
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
