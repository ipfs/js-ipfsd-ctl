/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const merge = require('merge-options')
const expect = chai.expect
chai.use(dirtyChai)

const { isNode } = require('ipfs-utils/src/env')
const hat = require('hat')
const IPFSFactory = require('../src')
const tests = [
  { type: 'go' },
  { type: 'js' },
  { type: 'proc' }
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
      let version = await f.version()

      if (fOpts.type === 'proc') {
        version = version.version
      }

      expect(version).to.be.eql(VERSION_STRING)
    })

    describe('spawn a node and attach api', () => {
      it('create init and start node', async function () {
        const ipfsd = await f.spawn()
        expect(ipfsd).to.exist()
        expect(ipfsd.api).to.exist()
        expect(ipfsd.api.id).to.exist()
        await ipfsd.stop()
      })
    })

    describe('spawn with default swarm addrs', () => {
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
        const f = await IPFSFactory.create(merge(fOpts, { defaultAddrs: true }))
        const ipfsd = await f.spawn()

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
          config: config
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

    describe('f.spawn with args', () => {
      if (!isNode && fOpts.type !== 'proc') { return }

      it('check that pubsub was enabled', async () => {
        const topic = `test-topic-${hat()}`
        const data = Buffer.from('hey there')
        const f = await IPFSFactory.create(merge(fOpts, { args: ['--enable-namesys-pubsub'] }))
        const ipfsd = await f.spawn()

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
        ipfsd = await f.spawn()
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
