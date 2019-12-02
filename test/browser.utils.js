/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const { isEnvWithDom } = require('ipfs-utils/src/env')
const { findBin, tmpDir, checkForRunningApi, defaultRepo, repoExists, removeRepo } = require('../src/utils')
const { create, createNode } = require('../src')

describe('utils browser version', function () {
  if (isEnvWithDom) {
    it('findBin should return undefined', () => {
      expect(findBin()).to.be.undefined()
    })

    it('tmpDir should return correct path', () => {
      expect(tmpDir('js')).to.be.contain('js_ipfs_')
      expect(tmpDir('go')).to.be.contain('go_ipfs_')
      expect(tmpDir()).to.be.contain('_ipfs_')
    })

    it('checkForRunningApi should return null', () => {
      expect(checkForRunningApi()).to.be.null()
    })

    it('defaultRepo should return ipfs', () => {
      expect(defaultRepo()).to.be.eq('ipfs')
    })

    it('removeRepo should work', async () => {
      const node = await createNode({
        type: 'proc',
        disposable: false,
        ipfsOptions: { repo: 'ipfs_test_remove' }
      })
      await node.init()
      await node.start()
      await node.stop()
      await removeRepo('ipfs_test_remove')
      expect(await repoExists('ipfs_test_remove')).to.be.false()
      expect(await repoExists('ipfs_test_remove/keys')).to.be.false()
      expect(await repoExists('ipfs_test_remove/blocks')).to.be.false()
      expect(await repoExists('ipfs_test_remove/datastore')).to.be.false()
    })

    describe('repoExists', () => {
      it('should resolve true when repo exists', async () => {
        const f = create({ type: 'proc' })
        const node = await f.spawn({ repo: 'ipfs_test' })
        expect(await repoExists('ipfs_test')).to.be.true()
        await node.stop()
      })
      it('should resolve false for random path', async () => {
        expect(await repoExists('random')).to.be.false()
      })
    })
  }
})
