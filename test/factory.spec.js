/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const { isNode } = require('ipfs-utils/src/env')
const { create } = require('../src')

const expect = chai.expect
chai.use(dirtyChai)

const types = [
  { type: 'js' },
  { type: 'go' },
  { type: 'proc' },
  { type: 'js', remote: true },
  { type: 'go', remote: true }
]

describe('`Factory tmpDir()` should return correct temporary dir', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const factory = create(opts)
      const dir = await factory.tmpDir()
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

describe('`Factory version()` should return correct temporary dir', () => {
  for (const opts of types) {
    it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
      const factory = await create(opts)
      const version = await factory.version()

      if (opts.type === 'go') {
        expect(version).to.be.contain('ipfs version')
      }

      if (opts.type === 'js') {
        expect(version).to.be.contain('js-ipfs version:')
      }

      if (opts.type === 'proc') {
        expect(version).to.have.keys(['version', 'repo', 'commit'])
      }
    })
  }
})

describe('`Factory spawn()` ', () => {
  describe('should return a node with api', () => {
    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        const factory = await create(opts)
        const node = await factory.spawn()
        expect(node).to.exist()
        expect(node.api).to.exist()
        expect(node.api.id).to.exist()
        await node.stop()
      })
    }
  })

  describe('should return a disposable node by default', () => {
    for (const opts of types) {
      it(`type: ${opts.type} remote: ${Boolean(opts.remote)}`, async () => {
        const factory = await create(opts)
        const node = await factory.spawn()

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
        const factory = await create({ ...opts, disposable: false })
        const tmpDir = await factory.tmpDir()
        const node = await factory.spawn({ repo: tmpDir })
        expect(node.started).to.be.false()
        expect(node.initialized).to.be.false()
        expect(node.path).to.be.eq(tmpDir)
      })
    }
  })
})
