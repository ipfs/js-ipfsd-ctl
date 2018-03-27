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
const isrunning = require('is-running')

const findIpfsExecutable = require('../src/utils/find-ipfs-executable')
const tempDir = require('../src/utils/tmp-dir')
const IPFSFactory = require('../src')

const dfBaseConfig = require('./utils/df-config-nodejs')

const tests = [
  { type: 'go', bits: 1024 },
  { type: 'js', bits: 512 }
]

tests.forEach((fOpts) => {
  describe(`${fOpts.type} daemon`, () => {
    const dfConfig = Object.assign({}, dfBaseConfig, { type: fOpts.type })
    const exec = findIpfsExecutable(fOpts.type)

    describe('start and stop', () => {
      let ipfsd
      let repoPath
      let api
      let pid
      let stopped = false

      before(function (done) {
        this.timeout(50 * 1000)

        const f = IPFSFactory.create(dfConfig)

        f.spawn({
          init: true,
          start: false,
          disposable: true,
          initOptions: { bits: fOpts.bits }
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

      it('daemon exec path should match type', () => {
        expect(exec).to.include.string(ipfsd.exec)
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
        this.timeout(20 * 1000)

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

      it('fail on start with non supported flags', function (done) {
        // TODO js-ipfs doesn't fail on unrecognized args.
        // Decided what should be the desired behaviour
        if (fOpts.type === 'js') { return this.skip() }

        const df = IPFSFactory.create(dfConfig)

        df.spawn({
          start: false,
          initOptions: { bits: fOpts.bits }
        }, (err, ipfsd) => {
          expect(err).to.not.exist()
          ipfsd.start(['--should-not-exist'], (err) => {
            expect(err).to.exist()
            expect(err.message)
              .to.match(/unknown option "should-not-exist"\n/)

            done()
          })
        })
      })
    })

    describe('start and stop with custom exec path', () => {
      let ipfsd
      before(function (done) {
        this.timeout(50 * 1000)

        const df = IPFSFactory.create(dfConfig)

        df.spawn({
          exec,
          initOptions: { bits: fOpts.bits }
        }, (err, daemon) => {
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

    describe('start and stop with custom ENV exec path', () => {
      let ipfsd

      before(function (done) {
        this.timeout(50 * 1000)

        const df = IPFSFactory.create(dfConfig)

        process.env = Object.assign({}, process.env, fOpts.type === 'go'
          ? { IPFS_GO_EXEC: exec } : { IPFS_JS_EXEC: exec })
        df.spawn({
          initOptions: { bits: fOpts.bits }
        }, (err, daemon) => {
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

    describe('should detect and attach to running node', () => {
      let ipfsd
      let exec

      before(function (done) {
        this.timeout(50 * 1000)

        const df = IPFSFactory.create(dfConfig)
        exec = findIpfsExecutable(fOpts.type)

        df.spawn({
          exec,
          initOptions: { bits: fOpts.bits }
        }, (err, daemon) => {
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

      it('shoul attach to running node', function (done) {
        this.timeout(50 * 1000)

        const df = IPFSFactory.create(dfConfig)
        df.spawn({
          initOptions: { bits: fOpts.bits },
          repoPath: ipfsd.repoPath,
          disposable: false
        }, (err, daemon) => {
          expect(err).to.not.exist()
          daemon.start((err, api) => {
            expect(err).to.not.exist()
            expect(api).to.exist()
            expect(ipfsd.apiAddr).to.be.eql(daemon.apiAddr)
            daemon.stop(done)
          })
        })
      })
    })

    describe('should fail on invalid exec path', function () {
      this.timeout(20 * 1000)

      let ipfsd
      before((done) => {
        const df = IPFSFactory.create(dfConfig)
        const exec = path.join('invalid', 'exec', 'ipfs')

        df.spawn({
          init: false,
          start: false,
          exec: exec,
          initOptions: { bits: fOpts.bits }
        }, (err, daemon) => {
          expect(err).to.not.exist()
          expect(daemon).to.exist()

          ipfsd = daemon
          done()
        })
      })

      after((done) => ipfsd.stop(done))

      it('should fail on init', (done) => {
        ipfsd.init((err, node) => {
          expect(err).to.exist()
          expect(node).to.not.exist()
          done()
        })
      })
    })

    describe('start and stop multiple times', () => {
      let ipfsd

      before(function (done) {
        this.timeout(20 * 1000)

        const f = IPFSFactory.create(dfConfig)

        async.series([
          (cb) => f.spawn({
            init: false,
            start: false,
            disposable: false,
            repoPath: tempDir(fOpts.type),
            initOptions: { bits: fOpts.bits },
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

      it('should return a node', function () {
        expect(ipfsd).to.exist()
      })

      it('daemon should be running', function (done) {
        ipfsd.pid((pid) => {
          expect(pid).to.exist()
          done()
        })
      })

      it('.stop', function (done) {
        this.timeout(20 * 1000)

        ipfsd.stop((err) => {
          expect(err).to.not.exist()
          ipfsd.pid((pid) => {
            expect(pid).to.not.exist()
            done()
          })
        })
      })

      it('.start', function (done) {
        this.timeout(20 * 1000)

        ipfsd.start((err) => {
          expect(err).to.not.exist()
          ipfsd.pid((pid) => {
            expect(pid).to.exist()
            done()
          })
        })
      })

      it('.stop and cleanup', function (done) {
        this.timeout(20 * 1000)

        ipfsd.stop((err) => {
          expect(err).to.not.exist()
          ipfsd.cleanup(done)
        })
      })
    })
  })
})
