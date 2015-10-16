var ipfsd = require('../index.js')
var assert = require('assert')
var ipfsApi = require('ipfs-api')
var run = require('subcomandante')
var fs = require('fs')
var rimraf = require('rimraf')

// this comment is used by mocha, do not delete
/*global describe, before, it*/

describe('disposable node with local api', function () {
  this.timeout(20000)
  var ipfs
  before(function (done) {
    ipfsd.disposable(function (err, node) {
      if (err) throw err
      node.startDaemon(function (err, ignore) {
        if (err) throw err
        ipfs = ipfsApi(node.apiAddr)
        done()
      })
    })
  })

  it('should have started the daemon and returned an api', function () {
    assert(ipfs)
    assert(ipfs.id)
  })

  var store, retrieve

  before(function (done) {
    var blorb = Buffer('blorb')
    ipfs.block.put(blorb, function (err, res) {
      if (err) throw err
      store = res.Key

      ipfs.block.get(res.Key, function (err, res) {
        if (err) throw err
        var buf = ''
        res
          .on('data', function (data) { buf += data })
          .on('end', function () {
            retrieve = buf
            done()
          })
      })
    })
  })
  it('should be able to store objects', function () {
    assert.equal(store, 'QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
  })
  it('should be able to retrieve objects', function () {
    assert.equal(retrieve, 'blorb')
  })
})

describe('disposableApi node', function () {
  this.timeout(20000)
  var ipfs
  before(function (done) {
    ipfsd.disposableApi(function (err, api) {
      if (err) throw err
      ipfs = api
      done()
    })
  })

  it('should have started the daemon and returned an api with host/port', function () {
    assert(ipfs)
    assert(ipfs.id)
    assert(ipfs.apiHost)
    assert(ipfs.apiPort)
  })

  var store, retrieve

  before(function (done) {
    var blorb = Buffer('blorb')
    ipfs.block.put(blorb, function (err, res) {
      if (err) throw err
      store = res.Key

      ipfs.block.get(res.Key, function (err, res) {
        if (err) throw err
        var buf = ''
        res
          .on('data', function (data) { buf += data })
          .on('end', function () {
            retrieve = buf
            done()
          })
      })
    })
  })
  it('should be able to store objects', function () {
    assert.equal(store, 'QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
  })
  it('should be able to retrieve objects', function () {
    assert.equal(retrieve, 'blorb')
  })
})

describe('starting and stopping', function () {
  this.timeout(10000)
  var node

  describe('init', function () {
    before(function (done) {
      ipfsd.disposable(function (err, res) {
        if (err) throw err
        node = res
        done()
      })
    })

    it('should returned a node', function () {
      assert(node)
    })

    it('daemon should not be running', function () {
      assert(!node.daemonPid())
    })
  })

  var pid

  describe('starting', function () {
    var ipfs
    before(function (done) {
      node.startDaemon(function (err, res) {
        if (err) throw err

        pid = node.daemonPid()
        ipfs = res

        // actually running?
        run('kill', ['-0', pid])
          .on(err, function (err) { throw err })
          .on('end', function () { done() })
      })
    })

    it('should be running', function () {
      assert(ipfs.id)
    })
  })

  var stopped = false
  describe('stopping', function () {
    before(function (done) {
      node.stopDaemon(function (err) {
        if (err) throw err
        stopped = true
      })
      // make sure it's not still running
      var poll = setInterval(function () {
        run('kill', ['-0', pid])
          .on('error', function () {
            clearInterval(poll)
            done()
            done = function () {} // so it does not get called again
          })
      }, 100)
    })

    it('should be stopped', function () {
      assert(!node.daemonPid())
      assert(stopped)
    })
  })
})

describe('setting up an initializing a local node', function () {
  var testpath1 = '/tmp/ipfstestpath1'

  describe('cleanup', function () {
    before(function (done) {
      rimraf(testpath1, done)
    })

    it('should not have a directory', function () {
      assert.equal(fs.existsSync('/tmp/ipfstestpath1'), false)
    })
  })

  describe('setup', function () {
    var node
    before(function (done) {
      ipfsd.local(testpath1, function (err, res) {
        if (err) throw err
        node = res
        done()
      })
    })

    it('should have returned a node', function () {
      assert(node)
    })

    it('should not be initialized', function () {
      assert.equal(node.initialized, false)
    })

    describe('initialize', function () {
      this.timeout(10000)

      before(function (done) {
        node.init(function (err) {
          if (err) throw err
          done()
        })
      })

      it('should have made a directory', function () {
        assert.equal(fs.existsSync(testpath1), true)
      })

      it('should be initialized', function () {
        assert.equal(node.initialized, true)
      })

      it('should be initialized', function () {
        assert.equal(node.initialized, true)
      })
    })
  })
})
