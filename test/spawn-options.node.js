/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const series = require('async/series')
const waterfall = require('async/waterfall')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const fs = require('fs')
const isNode = require('detect-node')
const hat = require('hat')
const DaemonFactory = require('../src')
const tempDir = require('../src/utils/tmp-dir')
const JSIPFS = require('ipfs')

const tests = [
  { type: 'go' },
  { type: 'js' },
  { type: 'proc', exec: JSIPFS }
]

describe('Spawn options', () => {
  tests.forEach((dfOpts) => describe(`${dfOpts.type}`, () => {
    // TODO pick this from go-ipfs-dep, otherwise test will keep breaking
    const VERSION_STRING = dfOpts.type === 'js'
      ? `js-ipfs version: ${require('ipfs/package.json').version}`
      : 'ipfs version 0.4.13'
    let df

    before(() => {
      df = DaemonFactory.create(dfOpts)
    })

    // TODO: why does ipfsd-ctl polute the env variables?
    // clean up IPFS env
    afterEach(() => Object.keys(process.env).forEach((key) => {
      if (key.includes('IPFS')) {
        delete process.env[key]
      }
    }))

    // TODO document this method on the readme
    it('df.version', (done) => {
      // TODO: Why can't this print the version as well??
      if (!isNode || dfOpts.type === 'proc') { this.skip() }

      df.version((err, version) => {
        expect(err).to.not.exist()
        expect(version).to.be.eql(VERSION_STRING)
        done()
      })
    })

    describe('init and start manually', function () {
      let ipfsd

      it('df.spawn', (done) => {
        const options = {
          init: false,
          start: false,
          disposable: true
        }

        df.spawn(options, (err, _ipfsd) => {
          expect(err).to.not.exist()
          expect(_ipfsd).to.exist()
          expect(_ipfsd.api).to.not.exist()

          ipfsd = _ipfsd
          done()
        })
      })

      it('ipfsd.init', function (done) {
        this.timeout(10 * 1000)

        ipfsd.init((err) => {
          expect(err).to.not.exist()
          expect(ipfsd.initialized).to.be.ok()
          done()
        })
      })

      it('ipfsd.start', function (done) {
        this.timeout(10 * 1000)

        ipfsd.start((err, api) => {
          expect(err).to.not.exist()
          expect(api).to.exist()
          expect(api.id).to.exist()
          done()
        })
      })

      it('ipfsd.stop', function (done) {
        this.timeout(10 * 1000)

        ipfsd.stop(done)
      })
    })

    describe('spawn from a initialized repo', () => {
      let ipfsd

      // TODO this test is not making sense. If the repo is initialized, why
      // are we passing disposable: true??
      it('df.spawn', function (done) {
        this.timeout(20 * 1000)

        const options = {
          start: false,
          disposable: true
        }

        df.spawn(options, (err, _ipfsd) => {
          expect(err).to.not.exist()
          expect(_ipfsd).to.exist()
          expect(_ipfsd.api).to.not.exist()

          ipfsd = _ipfsd
          done()
        })
      })

      it('start node', function (done) {
        this.timeout(20 * 1000)

        ipfsd.start((err, api) => {
          expect(err).to.not.exist()
          expect(api).to.exist()
          expect(api.id).to.exist()
          done()
        })
      })

      it('ipfsd.stop', function (done) {
        this.timeout(20 * 1000)

        ipfsd.stop(done)
      })
    })

    // TODO ?? What is this test trying to prove?
    describe('spawn a node and attach api', () => {
      let ipfsd

      it('create init and start node', function (done) {
        this.timeout(20 * 1000)

        df.spawn((err, _ipfsd) => {
          expect(err).to.not.exist()
          expect(_ipfsd).to.exist()
          expect(_ipfsd.api).to.exist()
          expect(_ipfsd.api.id).to.exist()

          ipfsd = _ipfsd
          done()
        })
      })

      it('ipfsd.stop', function (done) {
        this.timeout(20 * 1000)

        ipfsd.stop(done)
      })
    })

    describe('custom init options', () => {
      it('custom config', function (done) {
        this.timeout(20 * 1000)

        const addr = '/ip4/127.0.0.1/tcp/5678'
        const swarmAddr1 = '/ip4/127.0.0.1/tcp/35666'
        const config = {
          Addresses: {
            Swarm: [
              swarmAddr1
            ],
            API: addr
          }
        }

        const options = { config: config }

        waterfall([
          (cb) => df.spawn(options, cb),
          (ipfsd, cb) => ipfsd.getConfig('Addresses.API', (err, config) => {
            expect(err).to.not.exist()
            expect(config).to.eql(addr)
            cb(null, ipfsd)
          }),
          (ipfsd, cb) => ipfsd.getConfig('Addresses.Swarm', (err, config) => {
            expect(err).to.not.exist()

            // TODO why would this not be always the same type?
            if (typeof res === 'string') {
              config = JSON.parse(config)
            }
            expect(config).to.eql([swarmAddr1])
            cb(null, ipfsd)
          })
        ], (err, ipfsd) => {
          expect(err).to.not.exist()
          ipfsd.stop(done)
        })
      })
    })

    describe('custom repo path', () => {
      // TODO why wouldn't this work from the browser if we use the
      // remote endpoint?
      if (!isNode) { return }

      let ipfsd

      it('allows passing custom repo path to spawn', function (done) {
        this.timeout(50 * 1000)

        const repoPath = tempDir(dfOpts)

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
          repoPath: repoPath,
          config: config
        }

        series([
          (cb) => df.spawn(options, (err, _ipfsd) => {
            expect(err).to.not.exist()
            ipfsd = _ipfsd
            cb()
          }),
          (cb) => {
            ipfsd.init(cb)
          },
          (cb) => {
            ipfsd.start(cb)
          }
        ], (err) => {
          expect(err).to.not.exist()
          expect(fs.existsSync(repoPath)).to.be.ok()
          done()
        })
      })

      after((done) => {
        ipfsd.stop(() => ipfsd.cleanup(done))
      })
    })

    describe('df.spawn with args', () => {
      if (!isNode && dfOpts.type !== 'proc') { return this.skip() }

      let ipfsd

      it('spawn with pubsub', (done) => {
        const options = {
          args: ['--enable-pubsub-experiment']
        }

        df.spawn(options, (err, _ipfsd) => {
          expect(err).to.not.exist()
          ipfsd = _ipfsd
          done()
        })
      })

      it('check that pubsub was enabled', (done) => {
        const topic = `test-topic-${hat()}`
        const data = Buffer.from('hey there')

        const handler = (msg) => {
          expect(msg.data).to.eql(data)
          expect(msg).to.have.property('seqno')
          expect(Buffer.isBuffer(msg.seqno)).to.eql(true)
          expect(msg).to.have.property('topicIDs').eql([topic])
          done()
        }

        ipfsd.api.pubsub.subscribe(topic, handler, (err) => {
          expect(err).to.not.exist()
          ipfsd.api.pubsub.publish(topic, data)
        })
      })

      it('ipfsd.stop', (done) => {
        ipfsd.stop(done)
      })
    })

    describe('change config while running', () => {
      let ipfsd

      before(function (done) {
        this.timeout(50 * 1000)
        df.spawn((err, _ipfsd) => {
          expect(err).to.not.exist()
          ipfsd = _ipfsd
          done()
        })
      })

      after((done) => {
        ipfsd.stop(done)
      })

      it('ipfsd.getConfig', (done) => {
        ipfsd.getConfig((err, config) => {
          expect(err).to.not.exist()
          expect(config).to.exist()
          done()
        })
      })

      it('ipfsd.getConfig of specific value', (done) => {
        ipfsd.getConfig('Bootstrap', (err, config) => {
          expect(err).to.not.exist()
          expect(config).to.exist()
          done()
        })
      })

      it('Should set a config value', function (done) {
        this.timeout(20 * 1000)

        series([
          (cb) => ipfsd.setConfig('Bootstrap', 'null', cb),
          (cb) => ipfsd.getConfig('Bootstrap', cb)
        ], (err, res) => {
          expect(err).to.not.exist()
          expect(res[1]).to.eql('null')
          done()
        })
      })

      it('error on invalid config', function (done) {
        // TODO: fix this - js doesn't fail on invalid config
        if (dfOpts.type !== 'go') { return this.skip() }

        ipfsd.setConfig('Bootstrap', 'true', (err) => {
          expect(err.message)
            .to.match(/(?:Error: )?failed to set config value/mgi)
          done()
        })
      })
    })
  }))
})
