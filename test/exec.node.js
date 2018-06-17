/* eslint max-nested-callbacks: ["error", 6] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const isrunning = require('is-running')
const cp = require('child_process')
const path = require('path')
const exec = require('../src/utils/exec')
const os = require('os')

const isWindows = os.platform() === 'win32'

const survivor = path.join(__dirname, 'survivor')

function token () {
  return Math.random().toString().substr(2)
}

function psExpect (pid, shouldBeRunning, grace, callback) {
  setTimeout(() => {
    const actual = isrunning(pid)

    if (actual !== shouldBeRunning && grace > 0) {
      return psExpect(pid, shouldBeRunning, --grace, callback)
    }

    callback(null, actual)
  }, 200)
}

function isRunningGrep (pattern, callback) {
  const cmd = 'ps aux'
  cp.exec(cmd, { maxBuffer: 1024 * 500 }, (err, stdout, stderr) => {
    if (err) {
      return callback(err)
    }

    const running = stdout.match(pattern) !== null

    callback(null, running)
  })
}

function makeCheck (n, done) {
  let i = 0

  return (err) => {
    if (err) {
      return done(err)
    }

    if (++i === n) {
      done()
    }
  }
}

// TODO The test vector, `tail` is no longer a good test vector as it is not
// exiting as it once was when the test was designed
// - [ ] Need test vector or figure out why tail changed
// Ref: https://github.com/ipfs/js-ipfsd-ctl/pull/160#issuecomment-325669206
// UPDATE: 12/06/2017 - `tail` seems to work fine on all ci systems.
// I'm leaving it enabled for now. This does need a different approach for windows though.
describe('exec', () => {
  // TODO: skip on windows for now
  // TODO: running under coverage messes up the process hierarchies
  if (isWindows || process.env.COVERAGE) {
    return
  }

  it('captures stderr and stdout', (done) => {
    let stdout = ''
    let stderr = ''

    exec(process.execPath, [
      path.resolve(path.join(__dirname, 'fixtures', 'talky.js'))
    ], {
      stdout: (data) => {
        stdout += String(data)
      },
      stderr: (data) => {
        stderr += String(data)
      }
    }, (error) => {
      expect(error).to.not.exist()
      expect(stdout).to.equal('hello\n')
      expect(stderr).to.equal('world\n')

      done()
    })
  })

  it('survives process errors and captures exit code and stderr', (done) => {
    exec(process.execPath, [
      path.resolve(path.join(__dirname, 'fixtures', 'error.js'))
    ], {}, (error) => {
      expect(error.message).to.contain('non-zero exit code 1')
      expect(error.message).to.contain('Goodbye cruel world!')

      done()
    })
  })

  it('SIGTERM kills hang', (done) => {
    const tok = token()

    const check = makeCheck(2, done)
    const hang = 'tail -f /dev/null'.split(' ')
    const args = hang.concat(tok)

    const p = exec(args[0], args.slice(1), {}, (err) => {
      expect(err).to.not.exist()

      isRunningGrep(token, (err, running) => {
        expect(err).to.not.exist()
        expect(running).to.not.be.ok()
        check()
      })
    })

    psExpect(p.pid, true, 10, (err, running) => {
      expect(err).to.not.exist()
      expect(running).to.be.ok()

      p.kill('SIGTERM') // should kill it
      psExpect(p.pid, false, 10, (err, running) => {
        expect(err).to.not.exist()
        expect(running).to.not.be.ok()
        check()
      })
    })
  })

  it('SIGKILL kills survivor', (done) => {
    const check = makeCheck(2, done)

    const tok = token()

    const p = exec(survivor, [tok], {}, (err) => {
      expect(err).to.not.exist()

      isRunningGrep(token, (err, running) => {
        expect(err).to.not.exist()
        expect(running).to.not.be.ok()
        check()
      })
    })

    psExpect(p.pid, true, 10, (err, running) => {
      expect(err).to.not.exist()
      expect(running).to.be.ok()

      // should not kill it
      p.kill('SIGTERM')

      psExpect(p.pid, true, 10, (err, running) => {
        expect(err).to.not.exist()
        expect(running).to.be.ok()

        // will kill it
        p.kill('SIGKILL')

        psExpect(p.pid, false, 50, (err, running) => {
          expect(err).to.not.exist()
          expect(running).to.not.be.ok()
          check()
        })
      })
    })
  })
})
