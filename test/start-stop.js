/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const fs = require('fs')
const once = require('once')
const path = require('path')
const exec = require('../src/exec')

const DaemonFactory = require('../src')
const df = DaemonFactory.create()

module.exports = (type) => {
  return () => {
    describe('starting and stopping', () => {
      let ipfsd

      describe(`create and init a node (ctlr)`, function () {
        this.timeout(20 * 1000)
        before((done) => {
          df.spawn({ type, init: true, start: false, disposable: true }, (err, daemon) => {
            expect(err).to.not.exist()
            expect(daemon).to.exist()

            ipfsd = daemon
            done()
          })
        })

        it('should return a node', () => {
          expect(ipfsd).to.exist()
        })

        it('daemon should not be running', () => {
          expect(ipfsd.pid()).to.not.exist()
        })
      })

      let pid

      describe('starting', () => {
        let api

        before(function (done) {
          this.timeout(20 * 1000)
          ipfsd.start((err, ipfs) => {
            expect(err).to.not.exist()

            pid = ipfsd.pid()
            api = ipfs

            // actually running?
            done = once(done)
            exec('kill', ['-0', pid], { cleanup: true }, () => done())
          })
        })

        it('should be running', () => {
          expect(api.id).to.exist()
        })
      })

      describe('stopping', () => {
        let stopped = false

        before((done) => {
          ipfsd.stop((err) => {
            expect(err).to.not.exist()
            stopped = true
          })

          // make sure it's not still running
          const poll = setInterval(() => {
            exec('kill', ['-0', pid], { cleanup: true }, {
              error () {
                clearInterval(poll)
                done()
                // so it does not get called again
                done = () => {}
              }
            })
          }, 100)
        })

        it('should be stopped', function () {
          this.timeout(30 * 1000) // shutdown grace period is already 10500

          expect(ipfsd.pid()).to.not.exist()
          expect(stopped).to.equal(true)
          expect(fs.existsSync(path.join(ipfsd.path, 'repo.lock'))).to.not.be.ok()
          expect(fs.existsSync(path.join(ipfsd.path, 'api'))).to.not.be.ok()
        })
      })
    })
  }
}
