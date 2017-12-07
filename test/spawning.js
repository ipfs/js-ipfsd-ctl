/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const async = require('async')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const ipfsApi = require('ipfs-api')
const multiaddr = require('multiaddr')
const path = require('path')
const os = require('os')
const isNode = require('detect-node')
const isWindows = os.platform() === 'win32'

const addRetrieveTests = require('./add-retrive')

function tempDir (isJs) {
  return path.join(os.tmpdir(), `${isJs ? 'jsipfs' : 'ipfs'}_${String(Math.random()).substr(2)}`)
}

module.exports = (ipfsdController, isJs) => {
  return () => {
    const VERSION_STRING = isJs ? 'js-ipfs version: 0.27.0' : 'ipfs version 0.4.13'
    const API_PORT = isJs ? '5002' : '5001'
    const GW_PORT = isJs ? '9090' : '8080'

    it('prints the version', function (done) {
      if (!isNode) {
        this.skip()
      }
      ipfsdController.version({ isJs }, (err, version) => {
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
          ipfsdController.spawn({ isJs, init: false, start: false, disposable: true }, (err, ipfsd) => {
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
          ipfsdController.spawn({ isJs, start: false, disposable: true }, (err, ipfsd) => {
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
          ipfsdController.spawn({ isJs }, (err, ipfsd) => {
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
          'Addresses.Swarm': [swarmAddr1, swarmAddr2],
          'Addresses.API': addr
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
            (cb) => ipfsdController.spawn(options, cb),
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
          ipfsdController.spawn({ isJs }, (err, res) => {
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

        it('Should set a config value', (done) => {
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

      describe('ipfs-api version', () => {
        let ipfs
        let node

        before(function (done) {
          this.timeout(20 * 1000)
          ipfsdController.spawn({ start: false }, (err, ret) => {
            expect(err).to.not.exist()
            node = ret.ctrl
            node.startDaemon((err, ignore) => {
              expect(err).to.not.exist()
              ipfs = ipfsApi(node.apiAddr)
              done()
            })
          })
        })

        after((done) => node.stopDaemon(done))

        // skip on windows for now
        // https://github.com/ipfs/js-ipfsd-ctl/pull/155#issuecomment-326970190
        // fails on windows see https://github.com/ipfs/js-ipfs-api/issues/408
        if (isWindows || !isNode) {
          return it.skip('uses the correct ipfs-api')
        }

        it('uses the correct ipfs-api', (done) => {
          ipfs.util.addFromFs(path.join(__dirname, 'fixtures/'), {
            recursive: true
          }, (err, res) => {
            expect(err).to.not.exist()

            const added = res[res.length - 1]

            // Temporary: Need to see what is going on on windows
            expect(res).to.deep.equal([
              {
                path: 'fixtures/test.txt',
                hash: 'Qmf412jQZiuVUtdgnB36FXFX7xg5V6KEbSJ4dpQuhkLyfD',
                size: 19
              },
              {
                path: 'fixtures',
                hash: 'QmXkiTdnfRJjiQREtF5dWf2X4V9awNHQSn9YGofwVY4qUU',
                size: 73
              }
            ])

            expect(res.length).to.equal(2)
            expect(added).to.have.property('path', 'fixtures')
            expect(added).to.have.property(
              'hash',
              'QmXkiTdnfRJjiQREtF5dWf2X4V9awNHQSn9YGofwVY4qUU'
            )
            expect(res[0]).to.have.property('path', 'fixtures/test.txt')
            expect(res[0]).to.have.property(
              'hash',
              'Qmf412jQZiuVUtdgnB36FXFX7xg5V6KEbSJ4dpQuhkLyfD'
            )
            done()
          })
        })
      })

      describe('validate api', () => {
        it('starts the daemon and returns valid API and gateway addresses', function (done) {
          this.timeout(20 * 1000)
          ipfsdController.spawn({ isJs, config: null }, (err, ipfsd) => {
            expect(err).to.not.exist()
            const api = ipfsd.ctl
            const node = ipfsd.ctrl

            // Check for props in daemon
            expect(node).to.have.property('apiAddr')
            expect(node).to.have.property('gatewayAddr')
            expect(node.apiAddr).to.not.equal(null)
            expect(multiaddr.isMultiaddr(node.apiAddr)).to.equal(true)
            expect(node.gatewayAddr).to.not.equal(null)
            expect(multiaddr.isMultiaddr(node.gatewayAddr)).to.equal(true)

            // Check for props in ipfs-api instance
            expect(api).to.have.property('apiHost')
            expect(api).to.have.property('apiPort')
            expect(api).to.have.property('gatewayHost')
            expect(api).to.have.property('gatewayPort')
            expect(api.apiHost).to.equal('127.0.0.1')
            expect(api.apiPort).to.equal(API_PORT)
            expect(api.gatewayHost).to.equal('127.0.0.1')
            expect(api.gatewayPort).to.equal(GW_PORT)

            node.stopDaemon(done)
          })
        })

        it('allows passing flags', function (done) {
          // skip in js, since js-ipfs doesn't fail on unrecognized args, it prints the help instead
          if (isJs) {
            this.skip()
          } else {
            ipfsdController.spawn({ start: false }, (err, ipfsd) => {
              expect(err).to.not.exist()
              ipfsd.ctrl.startDaemon(['--should-not-exist'], (err) => {
                expect(err).to.exist()
                expect(err.message)
                  .to.match(/Unrecognized option 'should-not-exist'/)

                done()
              })
            })
          }
        })
      })
    })
  }
}
