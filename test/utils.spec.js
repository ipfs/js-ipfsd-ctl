/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const { waterfall } = require('async')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const fs = require('fs')
const isNode = require('detect-node')
const path = require('path')
const flatten = require('../src/utils/flatten')
const tempDir = require('../src/utils/tmp-dir')
const findIpfsExecutable = require('../src/utils/find-ipfs-executable')
const ctl = require('../src/index')
const { repoExists, removeRepo } = require('../src/utils/repo/nodejs')

describe('utils', () => {
  describe('repo', () => {
    it('repoExists should return true', (done) => {
      const fac = ctl.create({type: 'proc', exec: require('ipfs')})
      fac.spawn((err, ipfsd) => {
        if (err) {
          return done(err)
        }

        repoExists(ipfsd.path, (err, exists) => {
          if (err) {
            return done(err)
          }
          expect(exists).to.be.true()
          done()
        })
      })
    })

    it('repoExists should return false', (done) => {
      repoExists('test-fail', (err, exists) => {
        if (err) {
          return done(err)
        }
        expect(exists).to.be.false()
        done()
      })
    })

    it.only('removeRepo should delete repo', (done) => {
      const fac = ctl.create({type: 'proc', exec: require('ipfs')})

      waterfall([
        cb => fac.spawn({disposable: false}, cb),
        (ipfsd, cb) => ipfsd.init(cb),
        (ipfsd, cb) => ipfsd.start(err => {
          if (err) { return cb(err) }
          cb(null, ipfsd)
        }),
        (ipfsd, cb) => ipfsd.stop(err => {
          if (err) { return cb(err) }
          cb(null, ipfsd)
        }),
        (ipfsd, cb) => removeRepo(ipfsd.path, err => {
          if (err) { return cb(err) }
          cb(null, ipfsd)
        })
      ], (ipfsd, err) => {
        if (err) {
          return done(err)
        }
        repoExists(ipfsd.path, (err, exists) => {
          if (err) {
            return done(err)
          }
          expect(exists).to.be.false()
          done()
        })
      })
    })

    it.only('removeRepo shouldn\'t delete repo', (done) => {
      const fac = ctl.create({type: 'proc', exec: require('ipfs')})
      fac.spawn((err, ipfsd) => {
        if (err) {
          done(err)
        }
        removeRepo(ipfsd.path, (err) => {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  describe('.flatten', () => {
    it('should flatten', () => {
      expect(flatten({ a: { b: { c: [1, 2, 3] } } }))
        .to.eql({ 'a.b.c': [1, 2, 3] })
    })

    it('should handle nulls', () => {
      expect(flatten(null)).to.eql({})
    })

    it('should handle undefined', () => {
      expect(flatten(undefined)).to.eql({})
    })
  })

  describe('.tempDir', () => {
    it('should create tmp directory path for go-ipfs', () => {
      const tmpDir = tempDir()
      expect(tmpDir).to.exist()
      expect(tmpDir).to.include('ipfs_')
    })

    it('should create tmp directory path for js-ipfs', () => {
      const tmpDir = tempDir(true)
      expect(tmpDir).to.exist()
      expect(tmpDir).to.include('jsipfs_')
    })
  })

  if (isNode) {
    describe('.findIpfsExecutable', () => {
      it('should find go executable', () => {
        const execPath = findIpfsExecutable('go', __dirname)
        expect(execPath).to.exist()
        expect(execPath).to.include(path.join('go-ipfs-dep', 'go-ipfs', 'ipfs'))
        expect(fs.existsSync(execPath)).to.be.ok()
      })

      it('should find js executable', () => {
        const execPath = findIpfsExecutable('js', __dirname)
        expect(execPath).to.exist()
        expect(execPath).to.include(path.join('ipfs', 'src', 'cli', 'bin.js'))
        expect(fs.existsSync(execPath)).to.be.ok()
      })
    })
  }
})
