/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const async = require('async')
const fs = require('fs')
const path = require('path')
const os = require('os')
const isrunning = require('is-running')

const isWindows = os.platform() === 'win32'
const findIpfsExecutable = require('../src/utils/find-ipfs-executable')
const tempDir = require('../src/utils/tmp-dir')
const IPFSFactory = require('../src')

const dfBaseConfig = require('./utils/df-config-nodejs')

const types = ['js', 'go']

types.forEach((type) => {
  describe(`${type} daemon`, () => {
    const dfConfig = Object.assign(dfBaseConfig, { type: type })

    describe('start and stop', () => {
      if (isWindows) { return }

      let ipfsd
      let repoPath
      let api
      let pid
      let stopped = false

      before(function (done) {
        this.timeout(20 * 1000)
        const df = IPFSFactory.create(dfConfig)

        df.spawn({
          init: true,
          start: false,
          disposable: true
        }, (err, _ipfsd) => {
          expect(err).to.not.exist()
          expect(_ipfsd).to.exist()

          ipfsd = _ipfsd
          repoPath = ipfsd.path
          done()
        })
      })

      it('should return a node', () => {
        expect(ipfsd).to.exist()
      })

      // TODO fix this test
      it.skip('daemon exec path should match type', () => {
        let execPath = type === 'js'
          ? 'ipfs/src/cli/bin.js'
          : 'go-ipfs-dep/go-ipfs/ipfs'

        expect(ipfsd.exec).to.have.string(execPath)
      })

      it('daemon should not be running', (done) => {
        ipfsd.pid((pid) => {
          expect(pid).to.not.exist()
          done()
        })
      })

      it('.start', function (done) {
        this.timeout(20 * 1000)

        ipfsd.start((err, ipfs) => {
          expect(err).to.not.exist()

          ipfsd.pid((_pid) => {
            pid = _pid
            api = ipfs

            // actually running?
            expect(isrunning(pid)).to.be.ok()
            done()
          })
        })
      })

      it('is running', () => {
        expect(api.id).to.exist()
      })

      it('.stop', function (done) {
        this.timeout(20 * 1000)

        ipfsd.stop((err) => {
          expect(err).to.not.exist()
          let tries = 5

          const interval = setInterval(() => {
            const running = isrunning(pid)
            if (!running || tries-- <= 0) {
              clearInterval(interval)
              expect(running).to.not.be.ok()
              stopped = true
              done()
            }
          }, 200)
        })
      })

      it('is stopped', function (done) {
        // shutdown grace period is already 10500
        this.timeout(30 * 1000)

        ipfsd.pid((pid) => {
          expect(pid).to.not.exist()
          expect(stopped).to.equal(true)
          expect(fs.existsSync(path.join(ipfsd.path, 'repo.lock'))).to.not.be.ok()
          expect(fs.existsSync(path.join(ipfsd.path, 'api'))).to.not.be.ok()
          done()
        })
      })

      it('repo should cleaned up', () => {
        expect(fs.existsSync(repoPath)).to.not.be.ok()
      })

      it('.start with flags', (done) => {
        // TODO js-ipfs doesn't fail on unrecognized args. Think what should be
        // the desired behaviour
        if (type === 'js') { return this.skip() }

        const df = DaemonFactory.create(dfConfig)

        df.spawn({ start: false }, (err, ipfsd) => {
          expect(err).to.not.exist()
          ipfsd.start(['--should-not-exist'], (err) => {
            expect(err).to.exist()
            expect(err.message)
              .to.match(/Unrecognized option 'should-not-exist'/)

            done()
          })
        })
      })
    })

    describe('start and stop with custom exec path', () => {
      let ipfsd
      let exec

      before(function (done) {
        this.timeout(20 * 1000)

        const df = DaemonFactory.create(dfConfig)
        exec = findIpfsExecutable(type)

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

      describe('should fail on invalid exec path', function () {
        this.timeout(20 * 1000)

        before((done) => {
          const df = DaemonFactory.create(dfConfig)
          const exec = path.join('invalid', 'exec', 'ipfs')

          df.spawn({ init: false, start: false, exec: exec }, (err, daemon) => {
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

    describe('start and stop multiple times', () => {
      let ipfsd

      before(function (done) {
        this.timeout(20 * 1000)

        const df = DaemonFactory.create(dfConfig)

        async.series([
          (cb) => df.spawn({
            init: true,
            start: true,
            disposable: false,
            repoPath: tempDir(type),
            config: {
              Addresses: {
                Swarm: [`/ip4/127.0.0.1/tcp/0`],
                API: `/ip4/127.0.0.1/tcp/0`,
                Gateway: `/ip4/127.0.0.1/tcp/0`
              }
            }
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
})
