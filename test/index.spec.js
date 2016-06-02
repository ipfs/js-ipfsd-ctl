/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const ipfsd = require('../src')
const assert = require('assert')
const ipfsApi = require('ipfs-api')
const run = require('subcomandante')
const bs58 = require('bs58')
const fs = require('fs')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const path = require('path')

describe('ipfs executable path', function () {
  this.timeout(2000)
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
      assert.equal(node.exec, '/tmp/ipfsd-ctl-test/node_modules/go-ipfs-dep/go-ipfs/ipfs')
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
      assert.equal(node.exec, '/tmp/ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/go-ipfs-dep/go-ipfs/ipfs')
      rimraf('/tmp/ipfsd-ctl-test', done)
    })
  })
})

describe('disposable node with local api', function () {
  this.timeout(20000)
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

  it('should have started the daemon and returned an api', () => {
    assert(ipfs)
    assert(ipfs.id)
  })

  let store, retrieve

  before((done) => {
    const blorb = Buffer('blorb')
    ipfs.block.put(blorb, (err, block) => {
      if (err) throw err
      store = bs58.encode(block.key).toString()

      ipfs.block.get(store, (err, block) => {
        if (err) throw err
        retrieve = block.data
        done()
      })
    })
  })
  it('should be able to store objects', () => {
    assert.equal(store, 'QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
  })
  it('should be able to retrieve objects', () => {
    assert.equal(retrieve, 'blorb')
  })
})

describe('disposableApi node', function () {
  this.timeout(20000)
  let ipfs
  before((done) => {
    ipfsd.disposableApi((err, api) => {
      if (err) throw err
      ipfs = api
      done()
    })
  })

  it('should have started the daemon and returned an api with host/port', () => {
    assert(ipfs)
    assert(ipfs.id)
    assert(ipfs.apiHost)
    assert(ipfs.apiPort)
  })

  let store, retrieve

  before((done) => {
    const blorb = Buffer('blorb')
    ipfs.block.put(blorb, (err, block) => {
      if (err) throw err
      store = bs58.encode(block.key).toString()

      ipfs.block.get(store, (err, block) => {
        if (err) throw err
        retrieve = block.data
        done()
      })
    })
  })
  it('should be able to store objects', () => {
    assert.equal(store, 'QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
  })
  it('should be able to retrieve objects', () => {
    assert.equal(retrieve, 'blorb')
  })
})

describe('starting and stopping', function () {
  this.timeout(20000)
  let node

  describe('init', () => {
    before((done) => {
      ipfsd.disposable((err, res) => {
        if (err) throw err
        node = res
        done()
      })
    })

    it('should returned a node', () => {
      assert(node)
    })

    it('daemon should not be running', () => {
      assert(!node.daemonPid())
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
        run('kill', ['-0', pid])
          .on(err, (err) => { throw err })
          .on('end', () => { done() })
      })
    })

    it('should be running', () => {
      assert(ipfs.id)
    })
  })

  let stopped = false
  describe('stopping', () => {
    before((done) => {
      node.stopDaemon((err) => {
        if (err) throw err
        stopped = true
      })
      // make sure it's not still running
      const poll = setInterval(() => {
        run('kill', ['-0', pid])
          .on('error', () => {
            clearInterval(poll)
            done()
            done = () => {} // so it does not get called again
          })
      }, 100)
    })

    it('should be stopped', () => {
      assert(!node.daemonPid())
      assert(stopped)
    })
  })
})

describe('setting up and initializing a local node', () => {
  const testpath1 = '/tmp/ipfstestpath1'

  describe('cleanup', () => {
    before((done) => {
      rimraf(testpath1, done)
    })

    it('should not have a directory', () => {
      assert.equal(fs.existsSync('/tmp/ipfstestpath1'), false)
    })
  })

  describe('setup', () => {
    let node
    before((done) => {
      ipfsd.local(testpath1, (err, res) => {
        if (err) throw err
        node = res
        done()
      })
    })

    it('should have returned a node', () => {
      assert(node)
    })

    it('should not be initialized', () => {
      assert.equal(node.initialized, false)
    })

    describe('initialize', function () {
      this.timeout(10000)

      before((done) => {
        node.init((err) => {
          if (err) throw err
          done()
        })
      })

      it('should have made a directory', () => {
        assert.equal(fs.existsSync(testpath1), true)
      })

      it('should be initialized', () => {
        assert.equal(node.initialized, true)
      })

      it('should be initialized', () => {
        assert.equal(node.initialized, true)
      })
    })
  })
})

describe('change config values of a disposable node', function () {
  this.timeout(20000)

  let ipfsNode

  before((done) => {
    ipfsd.disposable((err, node) => {
      if (err) {
        throw err
      }
      ipfsNode = node
      done()
    })
  })

  it('Should return a config value', (done) => {
    ipfsNode.getConfig('Bootstrap', (err, config) => {
      if (err) {
        throw err
      }
      assert(config)
      done()
    })
  })

  it('Should set a config value', (done) => {
    ipfsNode.setConfig('Bootstrap', null, (err) => {
      if (err) {
        throw err
      }

      ipfsNode.getConfig('Bootstrap', (err, config) => {
        if (err) {
          throw err
        }
        assert.equal(config, 'null')
        done()
      })
    })
  })
})

describe('external ipfs binaray', () => {
  it('allows passing via $IPFS_EXEC', (done) => {
    process.env.IPFS_EXEC = '/some/path'
    ipfsd.local((err, node) => {
      if (err) throw err

      assert.equal(node.exec, '/some/path')

      process.env.IPFS_EXEC = ''
      done()
    })
  })
})

describe('version', () => {
  it('prints the version', (done) => {
    ipfsd.version((err, version) => {
      if (err) throw err

      assert(version)
      done()
    })
  })
})

describe('ipfs-api version', function () {
  this.timeout(20000)

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

  it('uses the correct ipfs-api', (done) => {
    ipfs.util.addFromFs(path.join(__dirname, 'fixtures'), { recursive: true }, (err, res) => {
      if (err) throw err

      const added = res[res.length - 1]
      assert(added)
      assert.equal(added.hash, 'QmXkiTdnfRJjiQREtF5dWf2X4V9awNHQSn9YGofwVY4qUU')
      done()
    })
  })
})

describe('node startDaemon', () => {
  it('allows passing flags', (done) => {
    ipfsd.disposable((err, node) => {
      if (err) throw err
      node.startDaemon(['--should-not-exist'], (err, ignore) => {
        if (!err) {
          throw new Error('should have errored')
        }

        let errStr = 'Unrecognized option \'should-not-exist\''

        if (String(err).indexOf(errStr) >= 0) {
          done() // correct error
        }

        throw err
      })
    })
  })
})
