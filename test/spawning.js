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

function tempDir (isJs) {
  return path.join(os.tmpdir(), `${isJs ? 'jsipfs' : 'ipfs'}_${String(Math.random()).substr(2)}`)
}

module.exports = (df, isJs) => {
  return () => {
    const VERSION_STRING = isJs ? `js-ipfs version: ${require('ipfs/package.json').version}` : 'ipfs version 0.4.13'

    it('prints the version', function (done) {
      if (!isNode) {
        this.skip()
      }
      df.version({ isJs }, (err, version) => {
        expect(err).to.not.exist()
        expect(version).to.be.eql(VERSION_STRING)
        done()
      })
    })

    describe('daemon spawning', () => {
      describe('spawn a bare node', function () {
        this.node = null
        this.api = null

        after(function (done) {
          this.timeout(20 * 1000)
          this.node.stopDaemon(done)
        })

        it('create node', function (done) {
          df.spawn({ isJs, init: false, start: false, disposable: true }, (err, ipfsd) => {
            expect(err).to.not.exist()
            expect(ipfsd.ctrl).to.exist()
            expect(ipfsd.ctl).to.not.exist()
            this.node = ipfsd.ctrl
            done()
          })
        })

        it('init node', function (done) {
          this.timeout(20 * 1000)
          this.node.init((err) => {
            expect(err).to.not.exist()
            expect(this.node.initialized).to.be.ok()
            done()
          })
        })

        it('start node', function (done) {
          this.timeout(30 * 1000)
          this.node.startDaemon((err, a) => {
            this.api = a
            expect(err).to.not.exist()
            expect(this.api).to.exist()
            expect(this.api.id).to.exist()
            done()
          })
        })

        addRetrieveTests()
      })

      describe('spawn an initialized node', function () {
        this.node = null
        this.api = null

        after(function (done) {
          this.timeout(20 * 1000)
          this.node.stopDaemon(done)
        })

        it('create node and init', function (done) {
          this.timeout(30 * 1000)
          df.spawn({ isJs, start: false, disposable: true }, (err, ipfsd) => {
            expect(err).to.not.exist()
            expect(ipfsd.ctrl).to.exist()
            expect(ipfsd.ctl).to.not.exist()
            this.node = ipfsd.ctrl
            done()
          })
        })

        it('start node', function (done) {
          this.timeout(30 * 1000)
          this.node.startDaemon((err, a) => {
            this.api = a
            expect(err).to.not.exist()
            expect(this.api).to.exist()
            expect(this.api.id).to.exist()
            done()
          })
        })

        addRetrieveTests()
      })

      describe('spawn a node and attach api', () => {
        this.node = null
        this.api = null

        after(function (done) {
          this.timeout(20 * 1000)
          this.node.stopDaemon(done)
        })

        it('create init and start node', function (done) {
          this.timeout(20 * 1000)
          df.spawn({ isJs }, (err, ipfsd) => {
            expect(err).to.not.exist()
            expect(ipfsd.ctrl).to.exist()
            expect(ipfsd.ctl).to.exist()
            expect(ipfsd.ctl.id).to.exist()
            this.node = ipfsd.ctrl
            this.api = ipfsd.ctl
            done()
          })
        })

        addRetrieveTests()
      })

      describe('spawn a node and pass init options', () => {
        const repoPath = tempDir(isJs)
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
            isJs
          }

          let node
          async.waterfall([
            (cb) => df.spawn(options, cb),
            (ipfsd, cb) => {
              node = ipfsd.ctrl
              node.getConfig('Addresses.API', (err, res) => {
                expect(err).to.not.exist()
                expect(res).to.be.eql(addr)
                cb()
              })
            },
            (cb) => {
              node.getConfig('Addresses.Swarm', (err, res) => {
                expect(err).to.not.exist()
                expect(JSON.parse(res)).to.deep.eql([swarmAddr1, swarmAddr2])
                cb()
              })
            }
          ], (err) => {
            expect(err).to.not.exist()
            node.stopDaemon(done)
          })
        })
      })

      describe('change config of a disposable node', () => {
        let node

        before(function (done) {
          this.timeout(20 * 1000)
          df.spawn({ isJs }, (err, res) => {
            if (err) {
              return done(err)
            }
            node = res.ctrl
            done()
          })
        })

        after((done) => node.stopDaemon(done))

        it('Should return a config value', (done) => {
          node.getConfig('Bootstrap', (err, config) => {
            expect(err).to.not.exist()
            expect(config).to.exist()
            done()
          })
        })

        it('Should return the whole config', (done) => {
          node.getConfig((err, config) => {
            expect(err).to.not.exist()
            expect(config).to.exist()
            done()
          })
        })

        // TODO: skip until https://github.com/ipfs/js-ipfs/pull/1134 is merged
        it.skip('Should set a config value', (done) => {
          async.series([
            (cb) => node.setConfig('Bootstrap', 'null', cb),
            (cb) => node.getConfig('Bootstrap', cb)
          ], (err, res) => {
            expect(err).to.not.exist()
            expect(res[1]).to.be.eql('null')
            done()
          })
        })

        it('should give an error if setting an invalid config value', function (done) {
          if (isJs) {
            this.skip() // js doesn't fail on invalid config
          } else {
            node.setConfig('Bootstrap', 'true', (err) => {
              expect(err.message).to.match(/failed to set config value/)
              done()
            })
          }
        })
      })
    })
  }
}
