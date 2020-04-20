/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const { expect } = require('aegir/utils/chai')
const os = require('os')
const path = require('path')
const { tmpDir, checkForRunningApi, defaultRepo, repoExists, removeRepo } = require('../src/utils')
const { createFactory, createController } = require('../src')

describe('utils node version', function () {
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
      const node = await createController({
        test: true,
        ipfsModule: require('ipfs'),
        ipfsHttpModule: require('ipfs-http-client'),
        ipfsBin: require.resolve('ipfs/src/cli/bin.js')
      })
      expect(checkForRunningApi(node.path)).to.be.contain('/ip4/127.0.0.1/tcp/')
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
      test: true,
      ipfsModule: require('ipfs'),
      ipfsHttpModule: require('ipfs-http-client'),
      ipfsBin: require.resolve('ipfs/src/cli/bin.js')
    })
    const dir = await f.tmpDir()
    const node = await f.spawn({
      type: 'proc',
      disposable: false,
      ipfsOptions: { repo: dir }
    })
    await node.init()
    await node.start()
    await node.stop()
    await removeRepo(dir)
    expect(await repoExists(dir)).to.be.false()
  })

  describe('repoExists', () => {
    it('should resolve true when repo exists', async () => {
      const node = await createController({
        type: 'proc',
        test: true,
        ipfsModule: require('ipfs'),
        ipfsHttpModule: require('ipfs-http-client'),
        ipfsBin: require.resolve('ipfs/src/cli/bin.js')
      })
      expect(await repoExists(node.path)).to.be.true()
      await node.stop()
    })
    it('should resolve false for random path', async () => {
      expect(await repoExists('random')).to.be.false()
    })
  })
})
