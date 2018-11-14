/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const waterfall = require('async/waterfall')
const isNode = require('detect-node')
const IPFSFactory = require('../src')

const expect = chai.expect
chai.use(dirtyChai)

const tests = [
  { type: 'go', bits: 1024 },
  { type: 'js', bits: 512 },
  { type: 'proc', exec: require('ipfs'), bits: 512 }
]

tests.forEach((fOpts) => {
  describe(`non-disposable ${fOpts.type} daemon`, function () {
    this.timeout(40000)
    let daemon = null
    let id = null

    before(function (done) {
      // Start a go daemon for attach tests
      const f = IPFSFactory.create({ type: 'go' })

      f.spawn({ initOptions: { bits: 1024 } }, (err, _ipfsd) => {
        if (err) {
          return done(err)
        }

        daemon = _ipfsd

        daemon.api.id()
          .then(data => {
            id = data.id
            done()
          })
      })
    })

    after(done => daemon.stop(done))

    it('should fail when passing initOptions to a initialized repo', function (done) {
      if (fOpts.type === 'proc' && !isNode) {
        return this.skip()
      }
      const df = IPFSFactory.create(fOpts)
      df.spawn({
        initOptions: { bits: fOpts.bits },
        repoPath: daemon.path,
        disposable: false,
        init: true
      }, (err, ipfsd) => {
        expect(err, err.message).to.exist()
        done()
      })
    })

    it('should attach to initialized and running node', function (done) {
      if (fOpts.type === 'proc' && !isNode) {
        return this.skip()
      }
      const df = IPFSFactory.create(fOpts)
      df.spawn({
        repoPath: daemon.path,
        disposable: false,
        init: true,
        start: true
      }, (err, ipfsd) => {
        if (err) {
          return done(err)
        }

        ipfsd.api.id()
          .then(data => {
            expect(data.id).to.be.eq(id)
            done()
          })
          .catch(done)
      })
    })

    it('should attach to running node with manual start', function (done) {
      if (fOpts.type === 'proc' && !isNode) {
        return this.skip()
      }
      const df = IPFSFactory.create(fOpts)
      df.spawn({
        repoPath: daemon.path,
        disposable: false,
        init: true
      }, (err, ipfsd) => {
        if (err) {
          return done(err)
        }

        ipfsd.start((err, api) => {
          if (err) {
            return done(err)
          }
          expect(api).to.exist()
          expect(daemon.apiAddr).to.be.eql(ipfsd.apiAddr)
          done()
        })
      })
    })

    it('should not init and start', function (done) {
      const df = IPFSFactory.create(fOpts)

      waterfall([
        cb => df.tmpDir(fOpts.type === 'js', cb),
        (path, cb) => df.spawn({
          initOptions: { bits: fOpts.bits },
          repoPath: path,
          disposable: false
        }, cb)
      ], (err, ipfsd) => {
        if (err) {
          return done(err)
        }
        expect(ipfsd.api).to.not.exist()
        ipfsd.stop(done())
      })
    })

    it('should init and start', function (done) {
      const df = IPFSFactory.create(fOpts)

      waterfall([
        cb => df.tmpDir(fOpts.type === 'js', cb),
        (path, cb) => df.spawn({
          initOptions: { bits: fOpts.bits },
          repoPath: path,
          disposable: false,
          start: true,
          init: true
        }, cb)
      ], (err, ipfsd) => {
        if (err) {
          return done(err)
        }
        expect(ipfsd.api).to.exist()

        ipfsd.stop(err => {
          if (err) {
            return done(err)
          }
          ipfsd.cleanup(done)
        })
      })
    })

    it('should only init', function (done) {
      const df = IPFSFactory.create(fOpts)

      waterfall([
        cb => df.tmpDir(fOpts.type === 'js', cb),
        (path, cb) => df.spawn({
          initOptions: { bits: fOpts.bits },
          repoPath: path,
          disposable: false,
          init: true
        }, cb)
      ], (err, ipfsd) => {
        if (err) {
          return done(err)
        }
        expect(ipfsd.initialized).to.be.true()
        expect(ipfsd.started).to.be.false()

        ipfsd.cleanup(done)
      })
    })

    it('should only init manualy', function (done) {
      const df = IPFSFactory.create(fOpts)

      waterfall([
        cb => df.tmpDir(fOpts.type === 'js', cb),
        (path, cb) => df.spawn({
          initOptions: { bits: fOpts.bits },
          repoPath: path,
          disposable: false
        }, cb)
      ], (err, ipfsd) => {
        if (err) {
          return done(err)
        }

        expect(ipfsd.initialized).to.be.false()
        ipfsd.init((err) => {
          expect(err).to.not.exist()
          expect(ipfsd.initialized).to.be.true()
          expect(ipfsd.started).to.be.false()
          ipfsd.cleanup(done)
        })
      })
    })
  })
})
