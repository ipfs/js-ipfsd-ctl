/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const async = require('async')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const path = require('path')
const os = require('os')
const isNode = require('detect-node')

const addRetrieveTests = require('./add-retrive')

function tempDir (js) {
  return path.join(os.tmpdir(), `${js ? 'jsipfs' : 'ipfs'}_${String(Math.random()).substr(2)}`)
}

module.exports = (df, type) => {
  return () => {
    const VERSION_STRING = type === 'js'
      ? `js-ipfs version: ${require('ipfs/package.json').version}`
      : 'ipfs version 0.4.13'

    describe('daemon spawning', () => {
      it('prints the version', function (done) {
        if (!isNode) {
          this.skip()
        }
        df.version({ type }, (err, version) => {
          expect(err).to.not.exist()
          expect(version).to.be.eql(VERSION_STRING)
          done()
        })
      })

      describe('spawn a bare node', function () {
        this.ipfsd = null

        after(function (done) {
          this.timeout(20 * 1000)
          this.ipfsd.stop(done)
        })

        it('create node', function (done) {
          df.spawn({ type, init: false, start: false, disposable: true }, (err, ipfsd) => {
            expect(err).to.not.exist()
            expect(ipfsd).to.exist()
            expect(ipfsd.api).to.not.exist()
            this.ipfsd = ipfsd
            done()
          })
        })

        it('init node', function (done) {
          this.timeout(20 * 1000)
          this.ipfsd.init((err) => {
            expect(err).to.not.exist()
            expect(this.ipfsd.initialized).to.be.ok()
            done()
          })
        })

        it('start node', function (done) {
          this.timeout(30 * 1000)
          this.ipfsd.start((err, api) => {
            expect(err).to.not.exist()
            expect(api).to.exist()
            expect(api.id).to.exist()
            done()
          })
        })

        addRetrieveTests()
      })

      describe('spawn an initialized node', function () {
        this.ipfsd = null

        after(function (done) {
          this.timeout(20 * 1000)
          this.ipfsd.stop(done)
        })

        it('create node and init', function (done) {
          this.timeout(30 * 1000)
          df.spawn({ type, start: false, disposable: true }, (err, ipfsd) => {
            expect(err).to.not.exist()
            expect(ipfsd).to.exist()
            expect(ipfsd.api).to.not.exist()
            this.ipfsd = ipfsd
            done()
          })
        })

        it('start node', function (done) {
          this.timeout(30 * 1000)
          this.ipfsd.start((err, api) => {
            expect(err).to.not.exist()
            expect(api).to.exist()
            expect(api.id).to.exist()
            done()
          })
        })

        addRetrieveTests()
      })

      describe('spawn a node and attach api', () => {
        this.ipfsd = null

        after(function (done) {
          this.timeout(20 * 1000)
          this.ipfsd.stop(done)
        })

        it('create init and start node', function (done) {
          this.timeout(20 * 1000)
          df.spawn({ type }, (err, ipfsd) => {
            expect(err).to.not.exist()
            expect(ipfsd).to.exist()
            expect(ipfsd.api).to.exist()
            expect(ipfsd.api.id).to.exist()
            this.ipfsd = ipfsd
            done()
          })
        })

        addRetrieveTests()
      })

      describe('spawn a node and pass init options', () => {
        const repoPath = tempDir(type === 'js')
        const addr = '/ip4/127.0.0.1/tcp/5678'
        const swarmAddr1 = '/ip4/127.0.0.1/tcp/35555/ws'
        const swarmAddr2 = '/ip4/127.0.0.1/tcp/35666'
        const config = {
          Addresses: {
            Swarm: [
              swarmAddr1,
              swarmAddr2
            ],
            API: addr
          }
        }

        it('allows passing ipfs config options to spawn', function (done) {
          this.timeout(20 * 1000)
          const options = {
            config,
            repoPath,
            init: true,
            type
          }

          let ipfsd
          async.waterfall([
            (cb) => df.spawn(options, cb),
            (res, cb) => {
              ipfsd = res
              ipfsd.getConfig('Addresses.API', (err, res) => {
                expect(err).to.not.exist()
                expect(res).to.be.eql(addr)
                cb()
              })
            },
            (cb) => {
              ipfsd.getConfig('Addresses.Swarm', (err, res) => {
                expect(err).to.not.exist()
                expect(JSON.parse(res)).to.deep.eql([swarmAddr1, swarmAddr2])
                cb()
              })
            }
          ], (err) => {
            expect(err).to.not.exist()
            ipfsd.stop(done)
          })
        })
      })

      describe('change config of a disposable node', () => {
        let ipfsd

        before(function (done) {
          this.timeout(20 * 1000)
          df.spawn({ type }, (err, res) => {
            if (err) {
              return done(err)
            }
            ipfsd = res
            done()
          })
        })

        after((done) => ipfsd.stop(done))

        it('Should return a config value', (done) => {
          ipfsd.getConfig('Bootstrap', (err, config) => {
            expect(err).to.not.exist()
            expect(config).to.exist()
            done()
          })
        })

        it('Should return the whole config', (done) => {
          ipfsd.getConfig((err, config) => {
            expect(err).to.not.exist()
            expect(config).to.exist()
            done()
          })
        })

        it('Should set a config value', (done) => {
          async.series([
            (cb) => ipfsd.setConfig('Bootstrap', 'null', cb),
            (cb) => ipfsd.getConfig('Bootstrap', cb)
          ], (err, res) => {
            expect(err).to.not.exist()
            expect(res[1]).to.be.eql('null')
            done()
          })
        })

        it('should give an error if setting an invalid config value', function (done) {
          if (type) {
            this.skip() // js doesn't fail on invalid config
          } else {
            ipfsd.setConfig('Bootstrap', 'true', (err) => {
              expect(err.message).to.match(/failed to set config value/)
              done()
            })
          }
        })
      })
    })
  }
}
