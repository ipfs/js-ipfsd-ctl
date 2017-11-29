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
const fs = require('fs')
const path = require('path')
const once = require('once')
const os = require('os')

const exec = require('../src/exec')
const ipfsdFactory = require('../src')

const isWindows = os.platform() === 'win32'

function tempDir (isJs) {
  return path.join(os.tmpdir(), `${isJs ? 'jsipfs' : 'ipfs'}_${String(Math.random()).substr(2)}`)
}

module.exports = (isJs) => {
  return () => {
    const VERSION_STRING = isJs ? 'js-ipfs version: 0.26.0' : 'ipfs version 0.4.11'

    const API_PORT = isJs ? '5002' : '5001'
    const GW_PORT = isJs ? '9090' : '8080'

    it('prints the version', (done) => {
      ipfsdFactory.version({ isJs }, (err, version) => {
        expect(err).to.not.exist()
        expect(version).to.be.eql(VERSION_STRING)
        done()
      })
    })

    describe('daemon spawning', () => {
      describe('spawn a bare node', () => {
        let node = null
        let api = null

        after((done) => node.stopDaemon(done))

        it('create node', (done) => {
          ipfsdFactory.spawn({ isJs, init: false, start: false, disposable: true }, (err, ipfsd) => {
            expect(err).to.not.exist()
            expect(ipfsd.ctrl).to.exist()
            expect(ipfsd.ctl).to.not.exist()
            node = ipfsd.ctrl
            done()
          })
        })

        it('init node', (done) => {
          node.init((err) => {
            expect(err).to.not.exist()
            expect(node.initialized).to.be.ok()
            done()
          })
        })

        it('start node', (done) => {
          node.startDaemon((err, a) => {
            api = a
            expect(err).to.not.exist()
            expect(api).to.exist()
            expect(api.id).to.exist()
            done()
          })
        })

        describe('should add and retrieve content', () => {
          const blorb = Buffer.from('blorb')
          let store
          let retrieve

          before((done) => {
            async.waterfall([
              (cb) => api.block.put(blorb, cb),
              (block, cb) => {
                store = block.cid.toBaseEncodedString()
                api.block.get(store, cb)
              },
              (_block, cb) => {
                retrieve = _block.data
                cb()
              }
            ], done)
          })

          it('should be able to store objects', () => {
            expect(store)
              .to.eql('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
          })

          it('should be able to retrieve objects', () => {
            expect(retrieve.toString()).to.be.eql('blorb')
          })

          it('should have started the daemon and returned an api with host/port', () => {
            expect(api).to.have.property('id')
            expect(api).to.have.property('apiHost')
            expect(api).to.have.property('apiPort')
          })

          it('should be able to store objects', () => {
            expect(store)
              .to.equal('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
          })

          it('should be able to retrieve objects', () => {
            expect(retrieve.toString()).to.equal('blorb')
          })
        })
      })

      describe('spawn an initialized node', () => {
        let node = null
        let api = null

        after((done) => node.stopDaemon(done))

        it('create node and init', (done) => {
          ipfsdFactory.spawn({ isJs, start: false, disposable: true }, (err, ipfsd) => {
            expect(err).to.not.exist()
            expect(ipfsd.ctrl).to.exist()
            expect(ipfsd.ctl).to.not.exist()
            node = ipfsd.ctrl
            done()
          })
        })

        it('start node', (done) => {
          node.startDaemon((err, a) => {
            api = a
            expect(err).to.not.exist()
            expect(api).to.exist()
            expect(api.id).to.exist()
            done()
          })
        })

        describe('should add and retrieve content', () => {
          const blorb = Buffer.from('blorb')
          let store
          let retrieve

          before((done) => {
            async.waterfall([
              (cb) => api.block.put(blorb, cb),
              (block, cb) => {
                store = block.cid.toBaseEncodedString()
                api.block.get(store, cb)
              },
              (_block, cb) => {
                retrieve = _block.data
                cb()
              }
            ], done)
          })

          it('should be able to store objects', () => {
            expect(store)
              .to.eql('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
          })

          it('should be able to retrieve objects', () => {
            expect(retrieve.toString()).to.be.eql('blorb')
          })

          it('should have started the daemon and returned an api with host/port', () => {
            expect(api).to.have.property('id')
            expect(api).to.have.property('apiHost')
            expect(api).to.have.property('apiPort')
          })

          it('should be able to store objects', () => {
            expect(store)
              .to.equal('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
          })

          it('should be able to retrieve objects', () => {
            expect(retrieve.toString()).to.equal('blorb')
          })
        })
      })

      describe('spawn a node and attach api', () => {
        let node = null
        let api = null

        after((done) => node.stopDaemon(done))

        it('create init and start node', (done) => {
          ipfsdFactory.spawn({ isJs }, (err, ipfsd) => {
            expect(err).to.not.exist()
            expect(ipfsd.ctrl).to.exist()
            expect(ipfsd.ctl).to.exist()
            expect(ipfsd.ctl.id).to.exist()
            node = ipfsd.ctrl
            api = ipfsd.ctl
            done()
          })
        })

        describe('should add and retrieve content', () => {
          const blorb = Buffer.from('blorb')
          let store
          let retrieve

          before((done) => {
            async.waterfall([
              (cb) => api.block.put(blorb, cb),
              (block, cb) => {
                store = block.cid.toBaseEncodedString()
                api.block.get(store, cb)
              },
              (_block, cb) => {
                retrieve = _block.data
                cb()
              }
            ], done)
          })

          it('should be able to store objects', () => {
            expect(store)
              .to.eql('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
          })

          it('should be able to retrieve objects', () => {
            expect(retrieve.toString()).to.be.eql('blorb')
          })

          it('should have started the daemon and returned an api with host/port', () => {
            expect(api).to.have.property('id')
            expect(api).to.have.property('apiHost')
            expect(api).to.have.property('apiPort')
          })

          it('should be able to store objects', () => {
            expect(store)
              .to.equal('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
          })

          it('should be able to retrieve objects', () => {
            expect(retrieve.toString()).to.equal('blorb')
          })
        })
      })

      describe('spawn a node and pass init options', () => {
        const repoPath = tempDir(isJs)
        const addr = '/ip4/127.0.0.1/tcp/5678'
        const config = {
          'Addresses.API': addr
        }

        it('allows passing ipfs config options to spawn', (done) => {
          const options = {
            config,
            repoPath,
            init: true,
            isJs
          }

          let node
          async.waterfall([
            (cb) => ipfsdFactory.spawn(options, cb),
            (ipfsd, cb) => {
              node = ipfsd.ctrl
              node.getConfig('Addresses.API', cb)
            }
          ], (err, res) => {
            expect(err).to.not.exist()
            expect(res).to.be.eql(addr)
            async.series([
              (cb) => node.stopDaemon(cb)
            ], done)
          })
        })
      })

      describe('starting and stopping', () => {
        let node

        describe(`create and init a node (ctlr)`, () => {
          before((done) => {
            ipfsdFactory.spawn({ isJs, init: true, start: false, disposable: true }, (err, ipfsd) => {
              expect(err).to.not.exist()
              expect(ipfsd.ctrl).to.exist()

              node = ipfsd.ctrl
              done()
            })
          })

          it('should returned a node', () => {
            expect(node).to.exist()
          })

          it('daemon should not be running', () => {
            expect(node.daemonPid()).to.not.exist()
          })
        })

        let pid

        describe('starting', () => {
          let ipfs

          before((done) => {
            node.startDaemon((err, res) => {
              expect(err).to.not.exist()

              pid = node.daemonPid()
              ipfs = res

              // actually running?
              done = once(done)
              exec('kill', ['-0', pid], { cleanup: true }, () => done())
            })
          })

          it('should be running', () => {
            expect(ipfs.id).to.exist()
          })
        })

        describe('stopping', function () {
          this.timeout(20 * 1000) // shutdown grace period is already 10500
          let stopped = false

          before((done) => {
            node.stopDaemon((err) => {
              expect(err).to.not.exist()
              stopped = true
            })

            // make sure it's not still running
            const poll = setInterval(() => {
              exec('kill', ['-0', pid], { cleanup: true }, {
                error () {
                  clearInterval(poll)
                  done()
                  // so it does not get called again
                  done = () => {}
                }
              })
            }, 100)
          })

          it('should be stopped', () => {
            expect(node.daemonPid()).to.not.exist()
            expect(stopped).to.equal(true)
            expect(fs.existsSync(path.join(node.path, 'repo.lock'))).to.not.be.ok()
            expect(fs.existsSync(path.join(node.path, 'api'))).to.not.be.ok()
          })
        })
      })

      describe('change config of a disposable node', () => {
        let node
        // let ipfs

        before((done) => {
          ipfsdFactory.spawn({ isJs }, (err, res) => {
            if (err) {
              return done(err)
            }
            node = res.ctrl
            // ipfs = res.ctl
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

      describe('ipfs-api version', () => {
        let ipfs
        let node

        before((done) => {
          ipfsdFactory.spawn({ start: false }, (err, ret) => {
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
        if (isWindows) {
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

      describe('startDaemon', () => {
        it('starts the daemon and returns valid API and gateway addresses', (done) => {
          ipfsdFactory.spawn({ isJs, config: null }, (err, ipfsd) => {
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
            ipfsdFactory.spawn({ start: false }, (err, ipfsd) => {
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
