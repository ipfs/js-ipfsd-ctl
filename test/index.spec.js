/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const async = require('async')
const expect = require('chai').expect
const ipfsApi = require('ipfs-api')
const mh = require('multihashes')
const fs = require('fs')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const path = require('path')
const once = require('once')
const os = require('os')

const exec = require('../src/exec')
const ipfsd = require('../src')

describe('ipfs executable path', () => {
  let Node
  it('has the correct path when installed with npm3', (done) => {
    process.env.testpath = '/tmp/ipfsd-ctl-test/node_modules/ipfsd-ctl/lib' // fake __dirname
    let npm3Path = '/tmp/ipfsd-ctl-test/node_modules/go-ipfs-dep/go-ipfs'

    mkdirp(npm3Path, (err) => {
      if (err) {
        throw err
      }

      fs.writeFileSync(path.join(npm3Path, 'ipfs'))
      delete require.cache[require.resolve('../src/node.js')]
      Node = require('../src/node.js')
      var node = new Node()
      expect(
        node.exec
      ).to.be.eql(
        '/tmp/ipfsd-ctl-test/node_modules/go-ipfs-dep/go-ipfs/ipfs'
      )
      rimraf('/tmp/ipfsd-ctl-test', done)
    })
  })

  it('has the correct path when installed with npm2', (done) => {
    process.env.testpath = '/tmp/ipfsd-ctl-test/node_modules/ipfsd-ctl/lib' // fake __dirname
    let npm2Path = '/tmp/ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/go-ipfs-dep/go-ipfs'

    mkdirp(npm2Path, (err) => {
      if (err) {
        throw err
      }

      fs.writeFileSync(path.join(npm2Path, 'ipfs'))
      delete require.cache[require.resolve('../src/node.js')]
      Node = require('../src/node.js')
      var node = new Node()
      expect(
        node.exec
      ).to.be.eql(
        '/tmp/ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/go-ipfs-dep/go-ipfs/ipfs'
      )
      rimraf('/tmp/ipfsd-ctl-test', done)
    })
  })
})

describe('daemons', () => {
  describe('local node', () => {
    const repoPath = '/tmp/ipfsd-ctl-test'
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
            expect(err).to.not.exist
            expect(res[1]).to.be.eql(addr)
            rimraf(repoPath, cb)
          })
        }
      ], done)
    })
  })

  describe('disposable node', () => {
    const blorb = new Buffer('blorb')
    let ipfs
    let store
    let retrieve

    beforeEach((done) => {
      async.waterfall([
        (cb) => ipfs.block.put(blorb, cb),
        (block, cb) => block.key(cb),
        (key, cb) => {
          store = mh.toB58String(key)
          ipfs.block.get(store, cb)
        },
        (_block, cb) => {
          retrieve = _block.data
          cb()
        }
      ], done)
    })

    describe('with local api', () => {
      before((done) => {
        async.waterfall([
          (cb) => ipfsd.disposable(cb),
          (node, cb) => {
            node.startDaemon((err) => {
              if (err) {
                return cb(err)
              }
              ipfs = ipfsApi(node.apiAddr)
              cb()
            })
          }
        ], done)
      })

      it('should have started the daemon and returned an api', () => {
        expect(ipfs).to.exist
        expect(ipfs.id).to.exist
      })

      it('should be able to store objects', () => {
        expect(
          store
        ).to.be.eql(
          'QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ'
        )
      })

      it('should be able to retrieve objects', () => {
        expect(retrieve.toString()).to.be.eql('blorb')
      })
    })

    describe('disposableApi', () => {
      before((done) => {
        ipfsd.disposableApi((err, api) => {
          if (err) {
            done(err)
          }

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
        expect(
          store
        ).to.be.eql(
          'QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ'
        )
      })

      it('should be able to retrieve objects', () => {
        expect(retrieve.toString()).to.be.eql('blorb')
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
        expect(node).to.exist
      })

      it('daemon should not be running', () => {
        expect(node.daemonPid()).to.be.falsy
      })
    })

    let pid
    describe('starting', () => {
      let ipfs

      before((done) => {
        node.startDaemon((err, res) => {
          if (err) throw err

          pid = node.daemonPid()
          ipfs = res

          // actually running?
          done = once(done)
          exec('kill', ['-0', pid], {cleanup: true}, () => done())
        })
      })

      it('should be running', () => {
        expect(ipfs.id).to.be.truthy
      })
    })

    describe('stopping', () => {
      let stopped = false

      before((done) => {
        node.stopDaemon((err) => {
          if (err) {
            return done(err)
          }
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
        expect(node.daemonPid()).to.be.falsy
        expect(stopped).to.be.truthy
      })
    })
  })

  describe('setting up and init a local node', () => {
    const testpath1 = '/tmp/ipfstestpath1'

    describe('cleanup', () => {
      before((done) => {
        rimraf(testpath1, done)
      })

      it('should not have a directory', () => {
        expect(fs.existsSync('/tmp/ipfstestpath1')).to.be.eql(false)
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
        expect(node).to.exist
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
        expect(err).to.not.exist
        expect(config).to.exist
        done()
      })
    })

    it('Should set a config value', (done) => {
      async.series([
        (cb) => ipfsNode.setConfig('Bootstrap', 'null', cb),
        (cb) => ipfsNode.getConfig('Bootstrap', cb)
      ], (err, res) => {
        expect(err).to.not.exist
        expect(res[1]).to.be.eql('null')
        done()
      })
    })

    it('should give an error if setting an invalid config value', (done) => {
      ipfsNode.setConfig('Bootstrap', 'true', (err) => {
        expect(err.message).to.match(
           /failed to set config value/
        )
        done()
      })
    })
  })

  it('allows passing via $IPFS_EXEC', (done) => {
    process.env.IPFS_EXEC = '/some/path'
    ipfsd.local((err, node) => {
      expect(err).to.not.exist
      expect(node.exec).to.be.eql('/some/path')

      process.env.IPFS_EXEC = ''
      done()
    })
  })

  it('prints the version', (done) => {
    ipfsd.version((err, version) => {
      expect(err).to.not.exist
      expect(version).to.be.eql('ipfs version 0.4.4')
      done()
    })
  })

  describe('ipfs-api version', () => {
    let ipfs

    before((done) => {
      ipfsd.disposable((err, node) => {
        if (err) throw err
        node.startDaemon((err, ignore) => {
          if (err) throw err
          ipfs = ipfsApi(node.apiAddr)
          done()
        })
      })
    })

    // NOTE: if you change ./fixtures, the hash will need to be changed
    it('uses the correct ipfs-api', (done) => {
      ipfs.util.addFromFs(path.join(__dirname, 'fixtures/'), { recursive: true }, (err, res) => {
        if (err) throw err

        const added = res[res.length - 1]
        expect(added).to.have.property(
          'hash',
          'QmXkiTdnfRJjiQREtF5dWf2X4V9awNHQSn9YGofwVY4qUU'
        )
        done()
      })
    })
  })

  describe('startDaemon', () => {
    it('start and stop', (done) => {
      const dir = os.tmpdir() + `/${Math.ceil(Math.random() * 100)}`
      const check = (cb) => {
        if (fs.existsSync(path.join(dir, 'repo.lock'))) {
          cb(new Error('repo.lock not removed'))
        }
        if (fs.existsSync(path.join(dir, 'api'))) {
          cb(new Error('api file not removed'))
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

    it('should have started the daemon and returned an api with gateway host and port', (done) => {
      let daemon
      const dir = os.tmpdir() + `/${Math.ceil(Math.random() * 100)}`
      async.waterfall([
        (cb) => ipfsd.local(dir, cb),
        (node, cb) => {
          daemon = node
          node.init((err) => cb(err, node))
        },
        (node, cb) => node.startDaemon((err, api) => cb(err, api))
      ], (err, res) => {
        expect(err).to.not.exist
        expect(res).to.have.property('gatewayHost')
        expect(res).to.have.property('gatewayPort')
        daemon.stopDaemon(done)
      })
    })

    it('allows passing flags', (done) => {
      ipfsd.disposable((err, node) => {
        expect(err).to.not.exist

        node.startDaemon(['--should-not-exist'], (err) => {
          expect(err).to.exist
          expect(
            err.message
          ).to.match(
            /Unrecognized option 'should-not-exist'/
          )

          done()
        })
      })
    })
  })
})
