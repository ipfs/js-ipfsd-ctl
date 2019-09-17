/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const { isNode } = require('ipfs-utils/src/env')
const hat = require('hat')
const IPFSFactory = require('../src')
const JSIPFS = require('ipfs')
const { repoExists } = require('./../src/utils/repo/nodejs')
const tests = [
  { type: 'go', bits: 1024 },
  { type: 'js', bits: 512 },
  { type: 'proc', exec: JSIPFS, bits: 512 }
]

const jsVersion = require('ipfs/package.json').version
const versions = {
  js: `js-ipfs version: ${jsVersion}`,
  go: `ipfs version ${require('go-ipfs-dep/package.json').version}`,
  proc: jsVersion
}

describe('Spawn options', function () {
  this.timeout(60 * 1000)

  tests.forEach((fOpts) => describe(`${fOpts.type}`, () => {
    const VERSION_STRING = versions[fOpts.type]
    let f

    before(() => {
      f = IPFSFactory.create(fOpts)
    })

    it('f.version', async function () {
      let version = await f.version({
        type: fOpts.type,
        exec: fOpts.exec
      })

      if (fOpts.type === 'proc') {
        version = version.version
      }

      expect(version).to.be.eql(VERSION_STRING)
    })

    describe('spawn a node and attach api', () => {
      it('create init and start node', async function () {
        const ipfsd = await f.spawn({ initOptions: { bits: fOpts.bits, profile: 'test' } })
        expect(ipfsd).to.exist()
        expect(ipfsd.api).to.exist()
        expect(ipfsd.api.id).to.exist()
        await ipfsd.stop()
      })
    })

    // TODO re-enable when jenkins runs tests in isolation
    describe.skip('spawn with default swarm addrs', () => {
      const addrs = {
        go: [
          '/ip4/0.0.0.0/tcp/4001',
          '/ip6/::/tcp/4001'
        ],
        js: [
          '/ip4/0.0.0.0/tcp/4002',
          '/ip4/127.0.0.1/tcp/4003/ws'
        ],
        proc: [
          '/ip4/0.0.0.0/tcp/4002',
          '/ip4/127.0.0.1/tcp/4003/ws'
        ]
      }

      it('swarm contains default addrs', async function () {
        this.timeout(20 * 1000)

        if (!isNode && fOpts.type === 'proc') {
          this.skip()
        }

        const ipfsd = await f.spawn({
          defaultAddrs: true,
          initOptions: {
            bits: fOpts.bits,
            profile: 'test'
          }
        })

        let config = await ipfsd.getConfig('Addresses.Swarm')

        if (fOpts.type !== 'proc') {
          config = JSON.parse(config)
        }

        expect(config).to.deep.equal(addrs[fOpts.type])

        await ipfsd.stop()
      })
    })

    describe('custom config options', () => {
      it('custom config', async function () {
        const addr = '/ip4/127.0.0.1/tcp/5678'
        const swarmAddr1 = '/ip4/127.0.0.1/tcp/35666'
        const config = {
          Addresses: {
            Swarm: [
              swarmAddr1
            ],
            API: addr
          },
          Bootstrap: ['/dns4/wss0.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic']
        }

        const ipfsd = await f.spawn({
          config: config,
          initOptions: {
            bits: fOpts.bits,
            profile: 'test'
          }
        })
        const apiConfig = await ipfsd.getConfig('Addresses.API')
        expect(apiConfig).to.eql(addr)

        let swarmConfig = await ipfsd.getConfig('Addresses.Swarm')

        // TODO why would this not be always the same type?
        if (typeof swarmConfig === 'string') {
          swarmConfig = JSON.parse(swarmConfig)
        }
        expect(swarmConfig).to.eql([swarmAddr1])
        expect(swarmConfig).to.include(swarmAddr1)

        let bootstrapConfig = await ipfsd.getConfig('Bootstrap')

        if (typeof bootstrapConfig === 'string') {
          bootstrapConfig = JSON.parse(bootstrapConfig)
        }

        expect(bootstrapConfig).to.deep.equal(config.Bootstrap)
        await ipfsd.stop()
      })
    })

    describe('custom repo path', () => {
      // We can only check if it really got created when run in Node.js
      if (!isNode) { return }

      it('allows passing custom repo path to spawn', async function () {
        const repoPath = await f.tmpDir(fOpts.type)
        const options = {
          disposable: false,
          init: true,
          start: true,
          repoPath: repoPath,
          initOptions: { bits: fOpts.bits, profile: 'test' }
        }

        const ipfsd = await f.spawn(options)
        const exists = await repoExists(repoPath)
        expect(exists).to.be.true()
        await ipfsd.stop()
        await ipfsd.cleanup()
      })
    })

    describe('f.spawn with args', () => {
      if (!isNode && fOpts.type !== 'proc') { return }

      it('check that pubsub was enabled', async () => {
        const topic = `test-topic-${hat()}`
        const data = Buffer.from('hey there')
        const options = {
          args: ['--enable-namesys-pubsub'],
          initOptions: { bits: fOpts.bits, profile: 'test' }
        }

        const ipfsd = await f.spawn(options)

        return new Promise(async (resolve, reject) => { // eslint-disable-line no-async-promise-executor
          const handler = async (msg) => {
            try {
              expect(msg.data).to.eql(data)
              expect(msg).to.have.property('seqno')
              expect(Buffer.isBuffer(msg.seqno)).to.eql(true)
              expect(msg).to.have.property('topicIDs').eql([topic])
              resolve()
            } catch (err) {
              reject(err)
            } finally {
              await ipfsd.stop()
            }
          }

          await ipfsd.api.pubsub.subscribe(topic, handler)
          await ipfsd.api.pubsub.publish(topic, data)
        })
      })
    })

    describe('change config while running', () => {
      let ipfsd

      before(async function () {
        ipfsd = await f.spawn({
          initOptions: {
            bits: fOpts.bits,
            profile: 'test'
          }
        })
      })

      after(async function () {
        await ipfsd.stop()
      })

      it('ipfsd.getConfig', async () => {
        const config = await ipfsd.getConfig()
        expect(config).to.exist()
      })

      it('ipfsd.getConfig of specific value', async () => {
        const config = await ipfsd.getConfig('Bootstrap')
        expect(config).to.exist()
      })

      it('Should set a config value', async function () {
        await ipfsd.setConfig('Bootstrap', 'null')
        const res = await ipfsd.getConfig('Bootstrap')

        expect(res).to.eql('null')
      })

      it('error on invalid config', async function () {
        // TODO: fix this - js doesn't fail on invalid config
        if (fOpts.type !== 'go') {
          return this.skip()
        }

        try {
          await ipfsd.setConfig('Bootstrap', 'true')
          expect.fail('Should have errored')
        } catch (err) {
          expect(err).to.exist()
        }
      })
    })
  }))
})
