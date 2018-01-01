/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const async = require('async')
const fs = require('fs')
const once = require('once')
const path = require('path')
const exec = require('../src/exec')

const findIpfsExecutable = require('../src/utils').findIpfsExecutable
const tempDir = require('../src/utils').tempDir

const DaemonFactory = require('../src')
const df = DaemonFactory.create()

module.exports = (type) => {
  return () => {
    describe('starting and stopping', () => {
      let ipfsd

      describe(`create and init a node (ipfsd)`, function () {
        this.timeout(20 * 1000)
        before((done) => {
          df.spawn({ init: true, start: false, disposable: true }, (err, daemon) => {
            expect(err).to.not.exist()
            expect(daemon).to.exist()

            ipfsd = daemon
            done()
          })
        })

        it('should return a node', () => {
          expect(ipfsd).to.exist()
        })

        it('daemon should not be running', (done) => {
          ipfsd.pid((pid) => {
            expect(pid).to.not.exist()
            done()
          })
        })
      })

      let pid
      describe('starting', () => {
        let api

        before(function (done) {
          this.timeout(20 * 1000)
          ipfsd.start((err, ipfs) => {
            expect(err).to.not.exist()

            ipfsd.pid((_pid) => {
              pid = _pid
              api = ipfs

              // actually running?
              done = once(done)
              exec('kill', ['-0', pid], { cleanup: true }, () => done())
            })
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

        it('should be stopped', function (done) {
          this.timeout(30 * 1000) // shutdown grace period is already 10500
          ipfsd.pid((pid) => {
            expect(pid).to.not.exist()
            expect(stopped).to.equal(true)
            expect(fs.existsSync(path.join(ipfsd.path, 'repo.lock'))).to.not.be.ok()
            expect(fs.existsSync(path.join(ipfsd.path, 'api'))).to.not.be.ok()
            done()
          })
        })
      })
    })

    describe('starting and stopping on custom exec path', () => {
      let ipfsd

      describe(`create and init a node (ipfsd) on custom exec path`, function () {
        this.timeout(20 * 1000)
        const exec = findIpfsExecutable(type)
        before((done) => {
          df.spawn({ exec }, (err, daemon) => {
            expect(err).to.not.exist()
            expect(daemon).to.exist()

            ipfsd = daemon
            done()
          })
        })

        after((done) => ipfsd.stop(done))

        it('should return a node', () => {
          expect(ipfsd).to.exist()
        })

        it('ipfsd.exec should match exec', () => {
          expect(ipfsd.exec).to.equal(exec)
        })
      })

      describe(`should fail on invalid exec path`, function () {
        this.timeout(20 * 1000)
        const exec = '/invalid/exec/ipfs'
        before((done) => {
          df.spawn({
            init: false,
            start: false,
            exec
          }, (err, daemon) => {
            expect(err).to.not.exist()
            expect(daemon).to.exist()

            ipfsd = daemon
            done()
          })
        })

        it('should fail on init', (done) => {
          ipfsd.init((err, node) => {
            expect(err).to.exist()
            expect(node).to.not.exist()
            done()
          })
        })
      })
    })

    describe('starting and stopping multiple times', () => {
      let ipfsd

      describe(`create and init a node (ipfsd)`, function () {
        this.timeout(20 * 1000)
        before((done) => {
          async.series([
            (cb) => df.spawn({
              init: false,
              start: false,
              disposable: false,
              repoPath: tempDir(type)
            }, (err, daemon) => {
              expect(err).to.not.exist()
              expect(daemon).to.exist()

              ipfsd = daemon
              cb()
            }),
            (cb) => ipfsd.init(cb),
            (cb) => ipfsd.start(cb)
          ], done)
        })

        it('should return a node', () => {
          expect(ipfsd).to.exist()
        })

        it('daemon should not be running', (done) => {
          ipfsd.pid((pid) => {
            expect(pid).to.exist()
            done()
          })
        })

        it('should stop', (done) => {
          ipfsd.stop((err) => {
            expect(err).to.not.exist()
            ipfsd.pid((pid) => {
              expect(pid).to.not.exist()
              done()
            })
          })
        })

        it('should start', (done) => {
          ipfsd.start((err) => {
            expect(err).to.not.exist()
            ipfsd.pid((pid) => {
              expect(pid).to.exist()
              done()
            })
          })
        })

        it('should stop and cleanup', (done) => {
          ipfsd.stop((err) => {
            expect(err).to.not.exist()
            ipfsd.cleanup(done)
          })
        })
      })
    })
  }
}
