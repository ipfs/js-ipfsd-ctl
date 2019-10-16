/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const { isNode } = require('ipfs-utils/src/env')
const IPFSFactory = require('../src')

const expect = chai.expect
chai.use(dirtyChai)

const tests = [
  { type: 'go', disposable: false },
  { type: 'js', disposable: false },
  { type: 'proc', disposable: false }
]

tests.forEach((fOpts) => {
  describe(`non-disposable ${fOpts.type} daemon`, function () {
    this.timeout(40000)
    let daemon = null
    let id = null

    before(async () => {
      // Start a go daemon for attach tests
      const f = IPFSFactory.create({ type: 'go' })
      daemon = await f.spawn()
      id = await daemon.api.id()
    })

    after(() => daemon.stop())

    it('should fail when passing initOptions to a initialized repo', async function () {
      if (fOpts.type === 'proc' && !isNode) {
        return this.skip()
      }
      const df = IPFSFactory.create(fOpts)
      try {
        await df.spawn({
          repo: daemon.path,
          init: true
        })
        throw new Error('Should throw')
      } catch (err) {
        expect(err, err.message).to.exist()
      }
    })

    it('should attach to initialized and running node', async function () {
      if (fOpts.type === 'proc' && !isNode) {
        return this.skip()
      }

      const df = IPFSFactory.create(fOpts)
      const ipfsd = await df.spawn({
        repo: daemon.path,
        init: true,
        start: true
      })

      const data = await ipfsd.api.id()
      expect(data.id).to.be.eq(id.id)
    })

    it('should attach to running node with manual start', async function () {
      if (fOpts.type === 'proc' && !isNode) {
        return this.skip()
      }
      const df = IPFSFactory.create(fOpts)
      const ipfsd = await df.spawn({
        repo: daemon.path,
        init: true
      })

      const api = await ipfsd.start()
      expect(daemon.apiAddr).to.be.eql(ipfsd.apiAddr)
      expect(api).to.exist()
    })

    it('should not init and start', async () => {
      const df = IPFSFactory.create(fOpts)
      const path = await df.tmpDir(fOpts.type)
      const ipfsd = await df.spawn({
        repo: path
      })
      expect(ipfsd.api).to.not.exist()
      expect(ipfsd.initialized).to.be.false()
      expect(ipfsd.started).to.be.false()
      await ipfsd.stop()
      await ipfsd.cleanup()
    })

    it('should init and start', async () => {
      const df = IPFSFactory.create(fOpts)
      const path = await df.tmpDir(fOpts.type)
      const ipfsd = await df.spawn({
        repo: path,
        start: true,
        init: true
      })
      expect(ipfsd.api).to.exist()
      expect(ipfsd.initialized).to.be.true()
      expect(ipfsd.started).to.be.true()
      await ipfsd.stop()
      await ipfsd.cleanup()
    })

    it('should only init', async () => {
      const df = IPFSFactory.create(fOpts)
      const path = await df.tmpDir(fOpts.type)
      const ipfsd = await df.spawn({
        repo: path,
        init: true
      })
      expect(ipfsd.initialized).to.be.true()
      expect(ipfsd.started).to.be.false()
    })

    it('should only init manualy', async () => {
      const df = IPFSFactory.create(fOpts)
      const path = await df.tmpDir(fOpts.type)
      const ipfsd = await df.spawn({
        repo: path
      })
      expect(ipfsd.initialized).to.be.false()
      await ipfsd.init()
      expect(ipfsd.initialized).to.be.true()
      expect(ipfsd.started).to.be.false()
    })
  })
})
