'use strict'

const ipfsd = require('../index.js')
const assert = require('assert')
const ipfsApi = require('ipfs-api')
const run = require('subcomandante')
const fs = require('fs')
const rimraf = require('rimraf')

// this comment is used by mocha, do not delete
/*global describe, before, it*/

describe('disposable node with local api', function () {
  this.timeout(20000)
  let ipfs
  before(done => {
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

  before(done => {
    const blorb = Buffer('blorb')
    ipfs.block.put(blorb, (err, res) => {
      if (err) throw err
      store = res.Key

      ipfs.block.get(res.Key, (err, res) => {
        if (err) throw err
        let buf = ''
        res
          .on('data', data => buf += data)
          .on('end', () => {
            retrieve = buf
            done()
          })
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
  before(done => {
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

  before(done => {
    const blorb = Buffer('blorb')
    ipfs.block.put(blorb, (err, res) => {
      if (err) throw err
      store = res.Key

      ipfs.block.get(res.Key, (err, res) => {
        if (err) throw err
        let buf = ''
        res
          .on('data', data => buf += data)
          .on('end', () => {
            retrieve = buf
            done()
          })
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
  this.timeout(10000)
  let node

  describe('init', () => {
    before(done => {
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
    before(done => {
      node.startDaemon((err, res) => {
        if (err) throw err

        pid = node.daemonPid()
        ipfs = res

        // actually running?
        run('kill', ['-0', pid])
          .on(err, err => { throw err })
          .on('end', () => { done() })
      })
    })

    it('should be running', () => {
      assert(ipfs.id)
    })
  })

  let stopped = false
  describe('stopping', () => {
    before(done => {
      node.stopDaemon(err => {
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

describe('setting up an initializing a local node', () => {
  const testpath1 = '/tmp/ipfstestpath1'

  describe('cleanup', () => {
    before(done => {
      rimraf(testpath1, done)
    })

    it('should not have a directory', () => {
      assert.equal(fs.existsSync('/tmp/ipfstestpath1'), false)
    })
  })

  describe('setup', () => {
    let node
    before(done => {
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

      before(done => {
        node.init(err => {
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

  before(done => {
    ipfsd.disposable((err, node) => {
      if (err) {
        throw err
      }
      ipfsNode = node
      done()
    })
  })

  it('Should return a config value', done => {
    ipfsNode.getConfig('Bootstrap', (err, config) => {
      if (err) {
        throw err
      }
      assert(config)
      done()
    })
  })

  it('Should set a config value', done => {
    ipfsNode.setConfig('Bootstrap', null, err => {
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
