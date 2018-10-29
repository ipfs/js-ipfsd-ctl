/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const IPFSFactory = require('../src')
const tmpDir = require('../src/utils/tmp-dir')

const expect = chai.expect
chai.use(dirtyChai)

const tests = [
  { type: 'go', bits: 1024 },
  { type: 'js', bits: 512 }
]

tests.forEach((fOpts) => {
  const config = Object.assign({}, {port: 25000}, fOpts)

  describe(`non-disposable ${fOpts.type} daemon`, function () {
    this.timeout(40000)
    let ipfsd = null
    let repoPath = null
    let id = null

    before(function (done) {
      const f = IPFSFactory.create(fOpts)

      f.spawn({ initOptions: { bits: fOpts.bits } }, (err, _ipfsd) => {
        if (err) {
          done(err)
        }
        ipfsd = _ipfsd
        repoPath = ipfsd.path

        ipfsd.api.id()
          .then(data => {
            id = data.id
            done()
          })
      })
    })

    after(done => ipfsd.stop(done))

    it('should fail when passing initOptions to a initialized repo', function (done) {
      const df = IPFSFactory.create(config)
      df.spawn({
        initOptions: { bits: fOpts.bits },
        repoPath: repoPath,
        disposable: false,
        init: true
      }, (err, ipfsd) => {
        expect(err, err.message).to.exist()
        done()
      })
    })

    it('should attach to initialized and running node', function (done) {
      const df = IPFSFactory.create(config)
      df.spawn({
        repoPath: ipfsd.repoPath,
        disposable: false,
        init: true,
        start: true
      }, (err, ipfsd) => {
        if (err) {
          done(err)
        }

        ipfsd.api.id()
          .then(data => {
            expect(data.id).to.be.eq(id)
            ipfsd.stop(done)
          })
          .catch(done)
      })
    })

    it('should attach to running node with manual start', function (done) {
      const df = IPFSFactory.create(config)
      df.spawn({
        repoPath: ipfsd.repoPath,
        disposable: false
      }, (err, daemon) => {
        if (err) {
          done(err)
        }

        daemon.start((err, api) => {
          if (err) {
            done(err)
          }
          expect(api).to.exist()
          expect(ipfsd.apiAddr).to.be.eql(daemon.apiAddr)
          daemon.stop(done)
        })
      })
    })

    it('should not init and start', function (done) {
      const df = IPFSFactory.create(config)
      df.spawn({
        initOptions: { bits: fOpts.bits },
        repoPath: tmpDir(fOpts.type === 'js'),
        disposable: false
      }, (err, ipfsd) => {
        if (err) {
          done(err)
        }

        expect(ipfsd.api).to.not.exist()
        ipfsd.stop(done())
      })
    })

    it('should init and start', function (done) {
      const df = IPFSFactory.create(config)
      df.spawn({
        initOptions: { bits: fOpts.bits },
        repoPath: tmpDir(fOpts.type === 'js'),
        disposable: false,
        start: true,
        init: true
      }, (err, ipfsd) => {
        if (err) {
          done(err)
        }

        expect(ipfsd.api).to.exist()
        ipfsd.stop(err => {
          if (err) {
            done(err)
          }
          ipfsd.cleanup(done)
        })
      })
    })

    it('should only init', function (done) {
      const df = IPFSFactory.create(config)
      df.spawn({
        initOptions: { bits: fOpts.bits },
        repoPath: tmpDir(fOpts.type === 'js'),
        disposable: false,
        init: true
      }, (err, ipfsd) => {
        if (err) {
          done(err)
        }
        expect(ipfsd.initialized).to.be.true()
        expect(ipfsd.started).to.be.false()

        ipfsd.stop(err => {
          if (err) {
            done(err)
          }
          ipfsd.cleanup(done)
        })
      })
    })

    it('should only init manualy', function (done) {
      const df = IPFSFactory.create(config)
      df.spawn({
        initOptions: { bits: fOpts.bits },
        repoPath: tmpDir(fOpts.type === 'js'),
        disposable: false,
        init: true
      }, (err, ipfsd) => {
        if (err) {
          done(err)
        }

        ipfsd.init((err) => {
          expect(err).to.not.exist()
          expect(ipfsd.initialized).to.be.true()
          expect(ipfsd.started).to.be.false()
          ipfsd.stop(err => {
            if (err) {
              done(err)
            }
            ipfsd.cleanup(done)
          })
        })
      })
    })
  })
})
