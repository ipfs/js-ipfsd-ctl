/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const { isNode } = require('ipfs-utils/src/env')
const { createFactory } = require('../src')

const expect = chai.expect
chai.use(dirtyChai)

const types = [
  { type: 'js', test: true },
  { type: 'go', test: true },
  { type: 'proc', test: true },
  { type: 'js', remote: true, test: true },
  { type: 'go', remote: true, test: true }
]

describe('`Factory tmpDir()` should return correct temporary dir', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const factory = createFactory()
      const dir = await factory.tmpDir(opts)
      expect(dir).to.exist()

      if (opts.type === 'go' && isNode) {
        expect(dir).to.contain('go_ipfs_')
      }
      if (opts.type === 'js' && isNode) {
        expect(dir).to.contain('js_ipfs_')
      }
      if (opts.type === 'proc' && isNode) {
        expect(dir).to.contain('proc_ipfs_')
      }
      if (opts.type === 'proc' && !isNode) {
        expect(dir).to.contain('proc_ipfs_')
      }
    })
  }
})

describe('`Factory spawn()` ', () => {
  describe('should return a node with api', () => {
    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        const factory = await createFactory()
        const node = await factory.spawn(opts)
        expect(node).to.exist()
        expect(node.api).to.exist()
        expect(node.api.id).to.exist()
        await node.stop()
      })
    }
  })

  describe('should return ctl for tests when factory inititalized with test === true', () => {
    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        const factory = await createFactory({ test: true })
        const ctl = await factory.spawn({ type: opts.type, remote: opts.remote })
        expect(ctl).to.exist()
        expect(ctl.opts.test).to.be.true()
        await ctl.stop()
      })
    }
  })

  describe('should return a disposable node by default', () => {
    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        const factory = await createFactory()
        const node = await factory.spawn(opts)

        expect(node.started).to.be.true()
        expect(node.initialized).to.be.true()
        expect(node.path).to.not.include('.jsipfs')
        expect(node.path).to.not.include('.ipfs')
        await node.stop()
      })
    }
  })

  describe('should return a non disposable node', () => {
    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        const factory = await createFactory()
        const tmpDir = await factory.tmpDir(opts)
        const node = await factory.spawn({ ...opts, disposable: false, ipfsOptions: { repo: tmpDir } })
        expect(node.started).to.be.false()
        expect(node.initialized).to.be.false()
        expect(node.path).to.be.eq(tmpDir)
      })
    }
  })

  describe('`Factory.clean()` should stop all nodes', () => {
    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        const factory = createFactory(opts)
        const ctl1 = await factory.spawn(opts)
        const ctl2 = await factory.spawn(opts)
        await factory.clean()
        expect(ctl1.started).to.be.false()
        expect(ctl2.started).to.be.false()
      })
    }
  })

  describe('`Factory.clean()` should not error when controller already stop', () => {
    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        const factory = createFactory(opts)
        const ctl1 = await factory.spawn(opts)
        const ctl2 = await factory.spawn(opts)
        await ctl2.stop()
        try {
          await factory.clean()
        } catch (error) {
          expect(error).to.not.exist()
        }
        expect(ctl1.started).to.be.false()
        expect(ctl2.started).to.be.false()
      })
    }
  })
})
