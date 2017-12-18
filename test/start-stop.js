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
      let ipfsCtrl

      describe(`create and init a node (ctlr)`, function () {
        this.timeout(20 * 1000)
        before((done) => {
          df.spawn({ type, init: true, start: false, disposable: true }, (err, ipfsd) => {
            expect(err).to.not.exist()
            expect(ipfsd.ctrl).to.exist()

            ipfsCtrl = ipfsd.ctrl
            done()
          })
        })

        it('should return a node', () => {
          expect(ipfsCtrl).to.exist()
        })

        it('daemon should not be running', () => {
          expect(ipfsCtrl.daemonPid()).to.not.exist()
        })
      })

      let pid

      describe('starting', () => {
        let ipfsCtl

        before(function (done) {
          this.timeout(20 * 1000)
          ipfsCtrl.startDaemon((err, ipfs) => {
            expect(err).to.not.exist()

            pid = ipfsCtrl.daemonPid()
            ipfsCtl = ipfs

            // actually running?
            done = once(done)
            exec('kill', ['-0', pid], { cleanup: true }, () => done())
          })
        })

        it('should be running', () => {
          expect(ipfsCtl.id).to.exist()
        })
      })

      describe('stopping', () => {
        let stopped = false

        before((done) => {
          ipfsCtrl.stopDaemon((err) => {
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

          expect(ipfsCtrl.daemonPid()).to.not.exist()
          expect(stopped).to.equal(true)
          expect(fs.existsSync(path.join(ipfsCtrl.path, 'repo.lock'))).to.not.be.ok()
          expect(fs.existsSync(path.join(ipfsCtrl.path, 'api'))).to.not.be.ok()
        })
      })
    })
  }
}
