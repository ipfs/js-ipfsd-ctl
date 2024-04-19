/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import os from 'os'
import path from 'path'
import { expect } from 'aegir/chai'
import * as kubo from 'kubo'
import { create as createKuboRPCClient } from 'kubo-rpc-client'
import { createFactory, createNode } from '../../src/index.js'
import { tmpDir, checkForRunningApi, repoExists, removeRepo, buildStartArgs, buildInitArgs } from '../../src/kubo/utils.js'

describe('utils', function () {
  this.timeout(60000)

  it('tmpDir should return correct path', () => {
    expect(tmpDir('js')).to.be.contain(path.join(os.tmpdir(), 'js_ipfs_'))
    expect(tmpDir('go')).to.be.contain(path.join(os.tmpdir(), 'go_ipfs_'))
    expect(tmpDir()).to.be.contain(path.join(os.tmpdir(), '_ipfs_'))
  })

  describe('checkForRunningApi', () => {
    it('should return undefined with path', () => {
      expect(checkForRunningApi()).to.be.undefined()
    })

    it('should return path to api with running node', async () => {
      const node = await createNode({
        test: true,
        type: 'kubo',
        rpc: createKuboRPCClient,
        bin: kubo.path()
      })

      const info = await node.info()

      if (info.repo == null) {
        throw new Error('info.repo was undefined')
      }

      const apiPath = checkForRunningApi(info.repo)

      expect(apiPath).to.contain('/ip4/127.0.0.1/tcp/')
      await node.stop()
    })
  })

  it('removeRepo should work', async () => {
    const f = createFactory({
      test: true,
      type: 'kubo',
      rpc: createKuboRPCClient,
      bin: kubo.path()
    })
    const node = await f.spawn({
      disposable: false
    })
    const info = await node.info()

    if (info.repo == null) {
      throw new Error('info.repo was undefined')
    }

    await node.stop()
    await removeRepo(info.repo)

    expect(await repoExists(info.repo)).to.be.false()
  })

  describe('repoExists', () => {
    it('should resolve true when repo exists', async () => {
      const node = await createNode({
        type: 'kubo',
        test: true,
        rpc: createKuboRPCClient,
        bin: kubo.path()
      })
      const info = await node.info()

      if (info.repo == null) {
        throw new Error('info.repo was undefined')
      }

      expect(await repoExists(info.repo)).to.be.true()

      await node.stop()
    })

    it('should resolve false for random path', async () => {
      expect(await repoExists('random')).to.be.false()
    })
  })

  describe('buildStartArgs', function () {
    it('custom args', () => {
      expect(buildStartArgs({ args: ['--foo=bar'] }).join(' ')).to.include('--foo=bar')
    })

    it('offline', () => {
      expect(buildStartArgs({
        offline: true
      }).join(' ')).to.include('--offline')
    })

    it('ipns pubsub', () => {
      expect(buildStartArgs({
        pubsub: true
      }).join(' ')).to.include('--enable-pubsub-experiment')
    })

    it('ipns pubsub', () => {
      expect(buildStartArgs({
        ipnsPubsub: true
      }).join(' ')).to.include('--enable-namesys-pubsub')
    })

    it('migrate', () => {
      expect(buildStartArgs({
        repoAutoMigrate: true
      }).join(' ')).to.include('--migrate')
    })
  })

  describe('buildInitArgs', function () {
    it('custom args', () => {
      expect(buildInitArgs({ args: ['--foo=bar'] }).join(' ')).to.include('--foo=bar')
    })

    it('bits', () => {
      expect(buildInitArgs({
        algorithm: 'rsa',
        bits: 512
      }).join(' ')).to.include('--bits 512')
    })

    it('algorithm', () => {
      expect(buildInitArgs({
        algorithm: 'rsa'
      }).join(' ')).to.include('--algorithm rsa')
    })

    it('empty repo', () => {
      expect(buildInitArgs({
        emptyRepo: true
      }).join(' ')).to.include('--empty-repo')
    })

    it('profiles', () => {
      expect(buildInitArgs({
        profiles: ['foo', 'bar']
      }).join(' ')).to.include('--profile foo,bar')
    })
  })
})
