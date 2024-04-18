/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import os from 'os'
import path from 'path'
import { expect } from 'aegir/chai'
import * as ipfsModule from 'ipfs'
import * as ipfsHttpModule from 'ipfs-http-client'
import { createFactory, createController } from '../src/index.js'
import { tmpDir, checkForRunningApi, defaultRepo, repoExists, removeRepo, buildInitArgs, buildStartArgs } from '../src/utils.js'

describe('utils node version', function () {
  this.timeout(60000)

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
        ipfsModule,
        ipfsHttpModule,
        ipfsBin: ipfsModule.path()
      })
      expect(checkForRunningApi(node.path)).to.be.contain('/ip4/127.0.0.1/tcp/')
      await node.stop()
    })
  })

  it('defaultRepo should return path', () => {
    expect(defaultRepo('js')).to.be.eq(path.join(os.homedir(), '.jsipfs'))
    expect(defaultRepo('go')).to.be.eq(path.join(os.homedir(), '.ipfs'))
    // @ts-expect-error arg is not a node type
    expect(defaultRepo('kjkjdsk')).to.be.eq(path.join(os.homedir(), '.ipfs'))
  })

  it('removeRepo should work', async () => {
    const f = createFactory({
      test: true,
      ipfsModule,
      ipfsHttpModule,
      ipfsBin: ipfsModule.path()
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
        ipfsModule,
        ipfsHttpModule,
        ipfsBin: ipfsModule.path()
      })
      expect(await repoExists(node.path)).to.be.true()
      await node.stop()
    })
    it('should resolve false for random path', async () => {
      expect(await repoExists('random')).to.be.false()
    })
  })

  describe('buildStartArgs', function () {
    it('custom args', () => {
      expect(buildStartArgs({
        args: ['--foo=bar']
      }).join(' ')).to.include('--foo=bar')
    })

    it('pass', () => {
      expect(buildStartArgs({
        type: 'js',
        ipfsOptions: {
          pass: 'baz'
        }
      }).join(' ')).to.include('--pass "baz"')
    })

    it('preload', () => {
      expect(buildStartArgs({
        type: 'js',
        ipfsOptions: {
          preload: true
        }
      }).join(' ')).to.include('--enable-preload')
    })

    it('preload disabled', () => {
      expect(buildStartArgs({
        type: 'js',
        ipfsOptions: {
          preload: false
        }
      }).join(' ')).to.include('--enable-preload false')
    })

    it('sharding', () => {
      expect(buildStartArgs({
        type: 'js',
        ipfsOptions: {
          EXPERIMENTAL: {
            sharding: true
          }
        }
      }).join(' ')).to.include('--enable-sharding-experiment')
    })

    it('offline', () => {
      expect(buildStartArgs({
        type: 'js',
        ipfsOptions: {
          offline: true
        }
      }).join(' ')).to.include('--offline')
    })

    it('ipns pubsub', () => {
      expect(buildStartArgs({
        type: 'js',
        ipfsOptions: {
          EXPERIMENTAL: {
            ipnsPubsub: true
          }
        }
      }).join(' ')).to.include('--enable-namesys-pubsub')
    })

    it('migrate', () => {
      expect(buildStartArgs({
        ipfsOptions: {
          repoAutoMigrate: true
        }
      }).join(' ')).to.include('--migrate')
    })
  })

  describe('buildInitArgs', function () {
    it('pass', () => {
      expect(buildStartArgs({
        type: 'js',
        ipfsOptions: {
          pass: 'baz'
        }
      }).join(' ')).to.include('--pass "baz"')
    })

    it('bits', () => {
      expect(buildInitArgs({
        ipfsOptions: {
          init: {
            bits: 512
          }
        }
      }).join(' ')).to.include('--bits 512')
    })

    it('algorithm', () => {
      expect(buildInitArgs({
        ipfsOptions: {
          init: {
            algorithm: 'rsa'
          }
        }
      }).join(' ')).to.include('--algorithm rsa')
    })

    it('empty repo', () => {
      expect(buildInitArgs({
        ipfsOptions: {
          init: {
            emptyRepo: true
          }
        }
      }).join(' ')).to.include('--empty-repo')
    })

    it('profiles', () => {
      expect(buildInitArgs({
        ipfsOptions: {
          init: {
            profiles: ['foo', 'bar']
          }
        }
      }).join(' ')).to.include('--profile foo,bar')
    })
  })
})
