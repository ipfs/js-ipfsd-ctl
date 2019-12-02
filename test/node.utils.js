/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const os = require('os')
const path = require('path')

const isWindows = os.platform() === 'win32'
const expect = chai.expect
chai.use(dirtyChai)

const { findBin, tmpDir, checkForRunningApi, defaultRepo, repoExists, removeRepo } = require('../src/utils')
const { createFactory, createNode } = require('../src')

describe('utils node version', function () {
  describe('findBin', () => {
    it('should return from process.env', () => {
      process.env.IPFS_JS_EXEC = 'js-ipfs'
      process.env.IPFS_GO_EXEC = 'go-ipfs'
      expect(findBin('js')).to.be.eq('js-ipfs')
      expect(findBin('go')).to.be.eq('go-ipfs')
      delete process.env.IPFS_JS_EXEC
      delete process.env.IPFS_GO_EXEC
    })
    it('should return from node modules', () => {
      expect(findBin('js')).to.be.contain('node_modules/ipfs/src/cli/bin.js')
      expect(findBin('go')).to.be.contain('node_modules/go-ipfs-dep/go-ipfs/ipfs')
      if (isWindows) {
        expect(findBin('go')).to.be.contain('node_modules/go-ipfs-dep/go-ipfs/ipfs.exe')
      }
    })
  })

  it('tmpDir should return correct path', () => {
    expect(tmpDir('js')).to.be.contain(path.join(os.tmpdir(), 'js_ipfs_'))
    expect(tmpDir('go')).to.be.contain(path.join(os.tmpdir(), 'go_ipfs_'))
    expect(tmpDir()).to.be.contain(path.join(os.tmpdir(), '_ipfs_'))
  })

  describe('checkForRunningApi', () => {
    it('should return null with no node running', () => {
      expect(checkForRunningApi()).to.be.null()
    })
    it('should return path to api with running node', async () => {
      const node = await createNode()
      expect(checkForRunningApi(node.path)).to.be.eq('/ip4/127.0.0.1/tcp/5001')
      await node.stop()
    })
  })

  it('defaultRepo should return path', () => {
    expect(defaultRepo('js')).to.be.eq(path.join(os.homedir(), '.jsipfs'))
    expect(defaultRepo('go')).to.be.eq(path.join(os.homedir(), '.ipfs'))
    expect(defaultRepo('kjkjdsk')).to.be.eq(path.join(os.homedir(), '.ipfs'))
  })

  it('removeRepo should work', async () => {
    const f = createFactory({
      type: 'proc',
      disposable: false
    })
    const dir = await f.tmpDir()
    const node = await f.spawn({ repo: dir })
    await node.init()
    await node.start()
    await node.stop()
    await removeRepo(dir)
    expect(await repoExists(dir)).to.be.false()
  })

  describe('repoExists', () => {
    it('should resolve true when repo exists', async () => {
      const node = await createNode({ type: 'proc' })
      expect(await repoExists(node.path)).to.be.true()
      await node.stop()
    })
    it('should resolve false for random path', async () => {
      expect(await repoExists('random')).to.be.false()
    })
  })
})
