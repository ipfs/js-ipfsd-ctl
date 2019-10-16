/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const fs = require('fs')
const path = require('path')
const merge = require('merge-options')
const isrunning = require('is-running')
const delay = require('delay')
const findIpfsExecutable = require('../src/utils/find-ipfs-executable')
const tempDir = require('../src/utils/tmp-dir')
const IPFSFactory = require('../src')

const dfBaseConfig = require('./utils/df-config-nodejs')

const tests = [
  { type: 'go' },
  { type: 'js' }
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

      before(async function () {
        this.timeout(50 * 1000)

        const f = IPFSFactory.create(dfConfig)

        ipfsd = await f.spawn({
          init: { profiles: ['test'] },
          start: false
        })
        expect(ipfsd).to.exist()

        repoPath = ipfsd.path
      })

      it('should return a node', () => {
        expect(ipfsd).to.exist()
      })

      it('daemon exec path should match type', () => {
        expect(exec).to.include.string(ipfsd.exec)
      })

      it('daemon should not be running', async () => {
        const pid = await ipfsd.pid()
        expect(pid).to.not.exist()
      })

      it('.start', async function () {
        this.timeout(20 * 1000)

        api = await ipfsd.start()
        pid = await ipfsd.pid()

        expect(isrunning(pid)).to.be.ok()
      })

      it('is running', () => {
        expect(api.id).to.exist()
      })

      it('.stop', async function () {
        this.timeout(20 * 1000)

        await ipfsd.stop()

        for (let i = 0; i < 5; i++) {
          const running = isrunning(pid)

          if (!running) {
            stopped = true

            return
          }

          delay(200)
        }

        expect.fail('Did not stop')
      })

      it('is stopped', async function () {
        // shutdown grace period is already 10500
        this.timeout(20 * 1000)

        const pid = await ipfsd.pid()

        expect(pid).to.not.exist()
        expect(stopped).to.equal(true)
        expect(fs.existsSync(path.join(ipfsd.path, 'repo.lock'))).to.not.be.ok()
        expect(fs.existsSync(path.join(ipfsd.path, 'api'))).to.not.be.ok()
      })

      it('repo should cleaned up', () => {
        expect(fs.existsSync(repoPath)).to.not.be.ok()
      })

      it('fail on start with non supported flags', async function () {
        // TODO js-ipfs doesn't fail on unrecognized args.
        // Decided what should be the desired behaviour
        if (fOpts.type === 'js') {
          return this.skip()
        }

        const df = IPFSFactory.create(merge({ args: ['--should-not-exist'] }, dfConfig))

        const ipfsd = await df.spawn({
          start: false,
          init: { profiles: ['test'] }
        })

        try {
          await ipfsd.start()
          expect.fail('Should have errored')
        } catch (err) {
          expect(err.message).to.contain('unknown option "should-not-exist"')
        }
      })
    })

    describe('start and stop with timeout', () => {
      let ipfsd
      let repoPath
      let api
      let pid
      let stopped = false

      before(async function () {
        this.timeout(50 * 1000)

        const f = IPFSFactory.create(dfConfig)

        ipfsd = await f.spawn({
          init: { profiles: ['test'] },
          start: false
        })

        expect(ipfsd).to.exist()
        repoPath = ipfsd.path
      })

      it('should return a node', () => {
        expect(ipfsd).to.exist()
      })

      it('daemon exec path should match type', () => {
        expect(exec).to.include.string(ipfsd.exec)
      })

      it('daemon should not be running', async () => {
        const pid = await ipfsd.pid()
        expect(pid).to.not.exist()
      })

      it('.start', async function () {
        this.timeout(20 * 1000)

        api = await ipfsd.start()
        pid = await ipfsd.pid()

        expect(isrunning(pid)).to.be.ok()
      })

      it('is running', () => {
        expect(api.id).to.exist()
      })

      it('.stop with timeout', async function () {
        this.timeout(15000 + 10) // should not take longer than timeout

        await ipfsd.stop(15000)

        stopped = !isrunning(pid)
        expect(stopped).to.be.ok()
      })

      it('is stopped', async function () {
        // shutdown grace period is already 10500
        this.timeout(20 * 1000)

        const pid = await ipfsd.pid()
        expect(pid).to.not.exist()
        expect(stopped).to.equal(true)
        expect(fs.existsSync(path.join(ipfsd.path, 'repo.lock'))).to.not.be.ok()
        expect(fs.existsSync(path.join(ipfsd.path, 'api'))).to.not.be.ok()
      })

      it('repo should cleaned up', () => {
        expect(fs.existsSync(repoPath)).to.not.be.ok()
      })

      it('fail on start with non supported flags', async function () {
        // TODO js-ipfs doesn't fail on unrecognized args.
        // Decided what should be the desired behaviour
        if (fOpts.type === 'js') {
          return this.skip()
        }

        const df = IPFSFactory.create(merge(dfConfig, { args: ['--should-not-exist'] }))

        const ipfsd = await df.spawn({
          start: false,
          init: { profiles: ['test'] }
        })

        try {
          await ipfsd.start()
          expect.fail('Should have errored')
        } catch (err) {
          expect(err.message).to.contain('unknown option "should-not-exist"')
        }
      })
    })

    describe('start and stop with custom exec path', () => {
      let ipfsd
      before(async function () {
        this.timeout(50 * 1000)

        const df = IPFSFactory.create(merge({ ipfsBin: exec }, dfConfig))

        ipfsd = await df.spawn({
          exec,
          initOptions: { profile: 'test' }
        })

        expect(ipfsd).to.exist()
      })

      after(async () => {
        await ipfsd.stop()
      })

      it('should return a node', () => {
        expect(ipfsd).to.exist()
      })

      it('ipfsd.exec should match exec', () => {
        expect(ipfsd.exec).to.equal(exec)
      })
    })

    describe('start and stop with custom ENV exec path', () => {
      let ipfsd

      before(async function () {
        this.timeout(50 * 1000)

        const df = IPFSFactory.create(dfConfig)

        process.env = Object.assign({}, process.env, fOpts.type === 'go'
          ? { IPFS_GO_EXEC: exec } : { IPFS_JS_EXEC: exec })

        ipfsd = await df.spawn({
          init: { profiles: ['test'] }
        })

        expect(ipfsd).to.exist()
      })

      after(async () => {
        await ipfsd.stop()
      })

      it('should return a node', () => {
        expect(ipfsd).to.exist()
      })

      it('ipfsd.exec should match exec', () => {
        expect(ipfsd.exec).to.equal(exec)
      })
    })

    describe('should fail on invalid exec path', function () {
      this.timeout(20 * 1000)

      let ipfsd
      before(async () => {
        const df = IPFSFactory.create(merge(dfConfig, {
          ipfsBin: path.join('invalid', 'exec', 'ipfs')
        }))

        ipfsd = await df.spawn({
          start: false,
          init: false
        })

        expect(ipfsd).to.exist()
      })

      after(async () => {
        await ipfsd.stop()
      })

      it('should fail on init', async () => {
        try {
          await ipfsd.init({ profile: 'test' })
          expect.fail('Should have errored')
        } catch (err) {
          expect(err).to.exist()
        }
      })
    })

    describe('start and stop multiple times', () => {
      let ipfsd

      before(async function () {
        this.timeout(20 * 1000)

        const f = IPFSFactory.create(merge({ disposable: false }, dfConfig))

        ipfsd = await f.spawn({
          init: false,
          start: false,
          repo: tempDir(fOpts.type)
        })

        expect(ipfsd).to.exist()

        await ipfsd.init({
          profile: 'test'
        })
        await ipfsd.start()
      })

      it('should return a node', function () {
        expect(ipfsd).to.exist()
      })

      it('daemon should be running', async function () {
        const pid = await ipfsd.pid()

        expect(pid).to.exist()
      })

      it('.stop', async function () {
        this.timeout(20 * 1000)

        await ipfsd.stop()

        const pid = await ipfsd.pid()

        expect(pid).to.not.exist()
      })

      it('.start', async function () {
        this.timeout(20 * 1000)

        await ipfsd.start()

        const pid = await ipfsd.pid()

        expect(pid).to.exist()
      })

      it('.stop and cleanup', async function () {
        this.timeout(20 * 1000)

        await ipfsd.stop()
        await ipfsd.cleanup()
      })
    })
  })
})
