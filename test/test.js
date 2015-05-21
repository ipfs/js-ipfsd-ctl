var run = require('comandante')
var ipfsd = require('../index.js')
var assert = require('assert')
var fs = require('fs')
var rimraf = require('rimraf')

var tempDirectories = []
function tmpDirectory () {
  var dir = '/tmp/ipfs_' + (Math.random() + '').substr(2)
  tempDirectories.push(dir)
  return dir
}

function randomPort () {
  // pick a really high port to make collisions unlikely enough
  return Math.floor((Math.random() * (65535 - 10000))) + 10000
}

function cleanup (done) {
  for (var i = 0; i < tempDirectories.length; i++) {
    rimraf(tempDirectories[i], function () {})
  }
  tempDirectories = []
  done()
}

describe('single node', function () {
  var apiPort = randomPort()
  var gatewayPort = randomPort()

  var api = '/ip4/127.0.0.1/tcp/' + apiPort
  var gateway = '/ip4/127.0.0.1/tcp/' + gatewayPort

  var node = ipfsd(tmpDirectory())

  describe('init', function () {
    var result

    // 10 seconds should be enough for everyone
    this.timeout(10000)

    before(function (done) {
      node.init({'Addresses.Gateway': gateway,
                 'Addresses.API': api},
                function (err, res) {
                  if (err) throw err
                  result = res
                  done()
                })
    })

    it('should have setup a node', function () {
      assert(result.match(/initializing ipfs node at/))
    })
  })

  describe('check gateway conf', function () {
    var testgateway = ''

    before(function (done) {
      node.getConf('Addresses.Gateway', function (err, res) {
        if (err) throw err
        testgateway = res
        done()
      })
    })

    it('should have the correct gateway addr configured', function () {
      assert.equal(testgateway.trim(), gateway)
    })
  })

  describe('check api conf', function () {
    var testapi = ''

    before(function (done) {
      node.getConf('Addresses.API', function (err, res) {
        if (err) throw err
        testapi = res
        done()
      })
    })

    it('should have the correct api addr configured', function () {
      assert.equal(testapi.trim(), api)
    })
  })

  describe('start daemon', function () {
    var ipfs

    this.timeout(10000)

    before(function (done) {
      node.daemon(function (err, api) {
        if (err) throw err
        ipfs = api
        done()
      })
    })

    it('should have started the daemon and returned an api', function () {
      assert(ipfs)
      assert(ipfs.add)
    })

    var store, retrieve

    before(function (done) {
      var blorb = Buffer('blorb')
      ipfs.block.put(blorb, function (err, res) {
        if (err) throw err
        store = res.Key

        ipfs.block.get(res.Key, function (err, res) {
          if (err) throw err
          retrieve = res

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

  describe('stop deamon', function () {
    var killed = false
    before(function (done) {
      node.stop(function (err) {
        if (err) throw err
        killed = true
        done()
      })
    })

    it('should have killed the process', function () {
      assert(killed)
    })
  })

  after(function (done) {
    cleanup(done)
  })
})
