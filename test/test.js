var ipfsd = require('../index.js')
var assert = require('assert')

describe('disposable node', function () {
  this.timeout(10000)
  var ipfs
  before(function (done) {
    ipfsd.disposable(function (err, api) {
      if (err) throw err
      ipfs = api
      done()
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
