/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const fs = require('fs-extra')
const { isNode } = require('ipfs-utils/src/env')
const hat = require('hat')
const IPFSFactory = require('../src')
const JSIPFS = require('ipfs')
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
  this.timeout(20 * 1000)

  tests.forEach((fOpts) => describe(`${fOpts.type}`, () => {
    const VERSION_STRING = versions[fOpts.type]
    let f

    before(() => {
      f = IPFSFactory.create(fOpts)
    })

    it('f.version', async function () {
      this.timeout(20 * 1000)

      let version = await f.version({
        type: fOpts.type,
        exec: fOpts.exec
      })

      if (fOpts.type === 'proc') {
        version = version.version
      }

      expect(version).to.be.eql(VERSION_STRING)
    })

    describe('init and start', () => {
      let prevRepoPath

      describe('init and start manually', () => {
        let ipfsd
        let repoPath

        before(async () => {
          const tmpDir = await f.tmpDir(fOpts.type)

          repoPath = tmpDir
          prevRepoPath = repoPath
        })

        it('f.spawn', async () => {
          const options = {
            repoPath: repoPath,
            init: false,
            start: false,
            disposable: false,
            initOptions: { bits: fOpts.bits, profile: 'test' }
          }

          ipfsd = await f.spawn(options)
          expect(ipfsd).to.exist()
          expect(ipfsd.api).to.not.exist()
          expect(ipfsd.initialized).to.eql(false)

          repoPath = ipfsd.repoPath
        })

        it('ipfsd.init', async function () {
          this.timeout(20 * 1000)

          await ipfsd.init()
          expect(ipfsd.initialized).to.be.ok()
        })

        it('ipfsd.start', async function () {
          this.timeout(20 * 1000)

          const api = await ipfsd.start()
          expect(api).to.exist()
          expect(api.id).to.exist()
        })

        it('ipfsd.stop', async function () {
          this.timeout(20 * 1000)

          await ipfsd.stop()
        })
      })

      describe('spawn from an initialized repo', () => {
        let ipfsd

        it('f.spawn', async function () {
          this.timeout(20 * 1000)

          ipfsd = await f.spawn({
            repoPath: prevRepoPath,
            init: false,
            start: false,
            disposable: false
          })
          expect(ipfsd).to.exist()
          expect(ipfsd.api).to.not.exist()
          expect(ipfsd.initialized).to.eql(true)
        })

        it('ipfsd.start', async function () {
          this.timeout(20 * 1000)

          const api = await ipfsd.start()
          expect(api).to.exist()
          expect(api.id).to.exist()
        })

        it('ipfsd.stop', async function () {
          this.timeout(20 * 1000)

          await ipfsd.stop()
        })
      })
    })

    describe('spawn a node and attach api', () => {
      let ipfsd

      it('create init and start node', async function () {
        this.timeout(20 * 1000)

        ipfsd = await f.spawn({ initOptions: { bits: fOpts.bits, profile: 'test' } })
        expect(ipfsd).to.exist()
        expect(ipfsd.api).to.exist()
        expect(ipfsd.api.id).to.exist()
      })

      it('ipfsd.stop', async function () {
        this.timeout(20 * 1000)

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
      let ipfsd

      after(async () => {
        if (ipfsd) {
          await ipfsd.stop()
        }
      })

      it('custom config', async function () {
        this.timeout(50 * 1000)

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

        ipfsd = await f.spawn({
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
      })
    })

    describe('custom repo path', () => {
      // TODO why wouldn't this work from the browser if we use the
      // remote endpoint?
      if (!isNode) { return }

      let ipfsd
      let repoPath

      before(async () => {
        repoPath = await f.tmpDir(fOpts.type)
      })

      it('allows passing custom repo path to spawn', async function () {
        this.timeout(20 * 1000)

        const config = {
          Addresses: {
            Swarm: [
              '/ip4/127.0.0.1/tcp/0/ws',
              '/ip4/127.0.0.1/tcp/0'
            ],
            API: '/ip4/127.0.0.1/tcp/0',
            Gateway: '/ip4/127.0.0.1/tcp/0'
          }
        }

        const options = {
          disposable: false,
          init: false,
          start: false,
          repoPath: repoPath,
          config: config,
          initOptions: { bits: fOpts.bits, profile: 'test' }
        }

        ipfsd = await f.spawn(options)
        await ipfsd.init()
        await ipfsd.start()

        if (isNode) {
          // We can only check if it really got created when run in Node.js
          expect(fs.existsSync(repoPath)).to.be.ok()
        }
      })

      after(async () => {
        await ipfsd.stop()
        await ipfsd.cleanup()
      })
    })

    describe('f.spawn with args', () => {
      if (!isNode && fOpts.type !== 'proc') { return }

      let ipfsd

      it('spawn with pubsub', async function () {
        this.timeout(20 * 1000)

        const options = {
          args: ['--enable-namesys-pubsub'],
          initOptions: { bits: fOpts.bits, profile: 'test' }
        }

        ipfsd = await f.spawn(options)
      })

      it('check that pubsub was enabled', () => {
        const topic = `test-topic-${hat()}`
        const data = Buffer.from('hey there')

        return new Promise(async (resolve, reject) => { // eslint-disable-line no-async-promise-executor
          const handler = (msg) => {
            try {
              expect(msg.data).to.eql(data)
              expect(msg).to.have.property('seqno')
              expect(Buffer.isBuffer(msg.seqno)).to.eql(true)
              expect(msg).to.have.property('topicIDs').eql([topic])
              resolve()
            } catch (err) {
              reject(err)
            }
          }

          await ipfsd.api.pubsub.subscribe(topic, handler)
          ipfsd.api.pubsub.publish(topic, data)
        })
      })

      it('ipfsd.stop', async function () {
        this.timeout(20 * 1000)
        await ipfsd.stop()
      })
    })

    describe('change config while running', () => {
      let ipfsd

      before(async function () {
        this.timeout(20 * 1000)
        ipfsd = await f.spawn({
          initOptions: {
            bits: fOpts.bits,
            profile: 'test'
          }
        })
      })

      after(async function () {
        this.timeout(20 * 1000)
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
        this.timeout(20 * 1000)

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
          expect(err.message).to.contain('failed to set config value')
        }
      })
    })
  }))
})
