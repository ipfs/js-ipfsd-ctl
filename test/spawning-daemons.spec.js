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
const rimraf = require('rimraf')
const path = require('path')
const once = require('once')
const os = require('os')

const exec = require('../src/exec')
const ipfsd = require('../src')

const isWindows = os.platform() === 'win32'

describe('daemon spawning', function () {
  this.timeout(60 * 1000)

  describe('local daemon', () => {
    const repoPath = path.join(os.tmpdir(), 'ipfsd-ctl-test')
    const addr = '/ip4/127.0.0.1/tcp/5678'
    const config = {
      Addresses: {
        API: addr
      }
    }

    it('allows passing flags to init', (done) => {
      async.waterfall([
        (cb) => ipfsd.local(repoPath, config, cb),
        (node, cb) => {
          async.series([
            (cb) => node.init(cb),
            (cb) => node.getConfig('Addresses.API', cb)
          ], (err, res) => {
            expect(err).to.not.exist()
            expect(res[1]).to.be.eql(addr)
            rimraf(repoPath, cb)
          })
        }
      ], done)
    })
  })

  describe('disposable daemon', () => {
    const blorb = Buffer.from('blorb')
    let ipfs
    let store
    let retrieve

    beforeEach((done) => {
      async.waterfall([
        (cb) => ipfs.block.put(blorb, cb),
        (block, cb) => {
          store = block.cid.toBaseEncodedString()
          ipfs.block.get(store, cb)
        },
        (_block, cb) => {
          retrieve = _block.data
          cb()
        }
      ], done)
    })

    describe('without api instance (.disposable)', () => {
      before((done) => {
        async.waterfall([
          (cb) => ipfsd.disposable(cb),
          (node, cb) => {
            node.startDaemon((err) => {
              expect(err).to.not.exist()
              ipfs = ipfsApi(node.apiAddr)
              cb()
            })
          }
        ], done)
      })

      it('should have started the daemon and returned an api', () => {
        expect(ipfs).to.exist()
        expect(ipfs.id).to.exist()
      })

      it('should be able to store objects', () => {
        expect(store)
          .to.eql('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
      })

      it('should be able to retrieve objects', () => {
        expect(retrieve.toString()).to.be.eql('blorb')
      })
    })

    describe('with api instance (.disposableApi)', () => {
      before((done) => {
        ipfsd.disposableApi((err, api) => {
          expect(err).to.not.exist()

          ipfs = api
          done()
        })
      })

      it('should have started the daemon and returned an api with host/port', () => {
        expect(ipfs).to.have.property('id')
        expect(ipfs).to.have.property('apiHost')
        expect(ipfs).to.have.property('apiPort')
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

  describe('starting and stopping', () => {
    let node

    describe('init', () => {
      before((done) => {
        ipfsd.disposable((err, res) => {
          if (err) {
            done(err)
          }
          node = res
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
          exec('kill', ['-0', pid], {cleanup: true}, () => done())
        })
      })

      it('should be running', () => {
        expect(ipfs.id).to.exist()
      })
    })

    describe('stopping', () => {
      let stopped = false

      before((done) => {
        node.stopDaemon((err) => {
          expect(err).to.not.exist()
          stopped = true
        })

        // make sure it's not still running
        const poll = setInterval(() => {
          exec('kill', ['-0', pid], {cleanup: true}, {
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
      })
    })
  })

  describe('setting up and init a local node', () => {
    const testpath1 = path.join(os.tmpdir(), 'ipfstestpath1')

    describe('cleanup', () => {
      before((done) => {
        rimraf(testpath1, done)
      })

      it('should not have a directory', () => {
        expect(fs.existsSync(testpath1)).to.be.eql(false)
      })
    })

    describe('setup', () => {
      let node
      before((done) => {
        ipfsd.local(testpath1, (err, res) => {
          if (err) {
            return done(err)
          }
          node = res
          done()
        })
      })

      it('should have returned a node', () => {
        expect(node).to.exist()
      })

      it('should not be initialized', () => {
        expect(node.initialized).to.be.eql(false)
      })

      describe('initialize', () => {
        before((done) => {
          node.init(done)
        })

        it('should have made a directory', () => {
          expect(fs.existsSync(testpath1)).to.be.eql(true)
        })

        it('should be initialized', () => {
          expect(node.initialized).to.be.eql(true)
        })

        it('should be initialized', () => {
          expect(node.initialized).to.be.eql(true)
        })
      })
    })
  })

  describe('change config of a disposable node', () => {
    let ipfsNode

    before((done) => {
      ipfsd.disposable((err, node) => {
        if (err) {
          return done(err)
        }
        ipfsNode = node
        done()
      })
    })

    it('Should return a config value', (done) => {
      ipfsNode.getConfig('Bootstrap', (err, config) => {
        expect(err).to.not.exist()
        expect(config).to.exist()
        done()
      })
    })

    it('Should return the whole config', (done) => {
      ipfsNode.getConfig((err, config) => {
        expect(err).to.not.exist()
        expect(config).to.exist()
        done()
      })
    })

    it('Should set a config value', (done) => {
      async.series([
        (cb) => ipfsNode.setConfig('Bootstrap', 'null', cb),
        (cb) => ipfsNode.getConfig('Bootstrap', cb)
      ], (err, res) => {
        expect(err).to.not.exist()
        expect(res[1]).to.be.eql('null')
        done()
      })
    })

    it('should give an error if setting an invalid config value', (done) => {
      ipfsNode.setConfig('Bootstrap', 'true', (err) => {
        expect(err.message).to.match(/failed to set config value/)
        done()
      })
    })
  })

  it('allows passing via $IPFS_EXEC', (done) => {
    process.env.IPFS_EXEC = '/some/path'
    ipfsd.local((err, node) => {
      expect(err).to.not.exist()
      expect(node.exec).to.be.eql('/some/path')

      process.env.IPFS_EXEC = ''
      done()
    })
  })

  it('prints the version', (done) => {
    ipfsd.version((err, version) => {
      expect(err).to.not.exist()
      expect(version).to.be.eql('ipfs version 0.4.11')
      done()
    })
  })

  describe('ipfs-api version', () => {
    let ipfs

    before((done) => {
      ipfsd.disposable((err, node) => {
        expect(err).to.not.exist()
        node.startDaemon((err, ignore) => {
          expect(err).to.not.exist()
          ipfs = ipfsApi(node.apiAddr)
          done()
        })
      })
    })

    // skip on windows for now
    // https://github.com/ipfs/js-ipfsd-ctl/pull/155#issuecomment-326970190
    // fails on windows see https://github.com/ipfs/js-ipfs-api/issues/408
    if (isWindows) { return it.skip('uses the correct ipfs-api') }

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
    it('start and stop', (done) => {
      const dir = `${os.tmpdir()}/tmp-${Date.now() + '-' + Math.random().toString(36)}`

      const check = (cb) => {
        // skip on windows
        // https://github.com/ipfs/js-ipfsd-ctl/pull/155#issuecomment-326983530
        if (!isWindows) {
          if (fs.existsSync(path.join(dir, 'repo.lock'))) {
            cb(new Error('repo.lock not removed'))
          }
          if (fs.existsSync(path.join(dir, 'api'))) {
            cb(new Error('api file not removed'))
          }
        }
        cb()
      }

      async.waterfall([
        (cb) => ipfsd.local(dir, cb),
        (node, cb) => node.init((err) => cb(err, node)),
        (node, cb) => node.startDaemon((err) => cb(err, node)),
        (node, cb) => node.stopDaemon(cb),
        check,
        (cb) => ipfsd.local(dir, cb),
        (node, cb) => node.startDaemon((err) => cb(err, node)),
        (node, cb) => node.stopDaemon(cb),
        check,
        (cb) => ipfsd.local(dir, cb),
        (node, cb) => node.startDaemon((err) => cb(err, node)),
        (node, cb) => node.stopDaemon(cb),
        check
      ], done)
    })

    it('starts the daemon and returns valid API and gateway addresses', (done) => {
      const dir = `${os.tmpdir()}/tmp-${Date.now() + '-' + Math.random().toString(36)}`

      async.waterfall([
        (cb) => ipfsd.local(dir, cb),
        (daemon, cb) => daemon.init((err) => cb(err, daemon)),
        (daemon, cb) => daemon.startDaemon((err, api) => cb(err, daemon, api))
      ], (err, daemon, api) => {
        expect(err).to.not.exist()

        // Check for props in daemon
        expect(daemon).to.have.property('apiAddr')
        expect(daemon).to.have.property('gatewayAddr')
        expect(daemon.apiAddr).to.not.equal(null)
        expect(multiaddr.isMultiaddr(daemon.apiAddr)).to.equal(true)
        expect(daemon.gatewayAddr).to.not.equal(null)
        expect(multiaddr.isMultiaddr(daemon.gatewayAddr)).to.equal(true)

        // Check for props in ipfs-api instance
        expect(api).to.have.property('apiHost')
        expect(api).to.have.property('apiPort')
        expect(api).to.have.property('gatewayHost')
        expect(api).to.have.property('gatewayPort')
        expect(api.apiHost).to.equal('127.0.0.1')
        expect(api.apiPort).to.equal('5001')
        expect(api.gatewayHost).to.equal('127.0.0.1')
        expect(api.gatewayPort).to.equal('8080')

        daemon.stopDaemon(done)
      })
    })

    it('allows passing flags', (done) => {
      ipfsd.disposable((err, node) => {
        expect(err).to.not.exist()

        node.startDaemon(['--should-not-exist'], (err) => {
          expect(err).to.exist()
          expect(err.message)
            .to.match(/Unrecognized option 'should-not-exist'/)

          done()
        })
      })
    })
  })
})
