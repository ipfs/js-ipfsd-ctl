/* eslint max-nested-callbacks: ["error", 6] */
/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const isrunning = require('is-running')
const cp = require('child_process')
const path = require('path')
const exec = require('../src/exec')

const survivor = path.join(__dirname, 'survivor')
const hang = 'tail -f /dev/null'.split(' ')

function token () {
  return Math.random().toString().substr(2)
}

function psExpect (pid, expect, grace, cb) {
  setTimeout(() => {
    const actual = isrunning(pid)

    if (actual !== expect && grace > 0) {
      psExpect(pid, expect, grace--, cb)
      return
    }

    cb(null, actual)
  }, 200)
}

function isRunningGrep (pattern, cb) {
  const cmd = 'ps aux'
  cp.exec(cmd, (err, stdout, stderr) => {
    if (err) {
      return cb(err)
    }

    const running = stdout.match(pattern) !== null

    cb(null, running)
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

describe('run', () => {
  it('SIGTERM kills hang', (done) => {
    const tok = token()

    const check = makeCheck(2, done)
    const args = hang.concat(tok)

    const p = exec(args[0], args.slice(1), {}, (err) => {
      // `tail -f /dev/null somerandom` errors out
      expect(err).to.exist

      isRunningGrep(token, (err, running) => {
        expect(err).to.not.exist
        expect(running).to.not.be.ok
        check()
      })
    })

    psExpect(p.pid, true, 10, (err, running) => {
      expect(err).to.not.exist
      expect(running).to.be.ok

      p.kill('SIGTERM') // should kill it
      psExpect(p.pid, false, 10, (err, running) => {
        expect(err).to.not.exist
        expect(running).to.not.be.ok
        check()
      })
    })
  })

  it('SIGKILL kills survivor', (done) => {
    const check = makeCheck(2, done)

    const tok = token()

    const p = exec(survivor, [tok], {}, (err) => {
      // killed, so not exiting with code 0
      expect(err).to.exist

      isRunningGrep(token, (err, running) => {
        expect(err).to.not.exist
        expect(running).to.not.be.ok
        check()
      })
    })

    p.stdout.pipe(process.stdout)
    p.stderr.pipe(process.stderr)

    psExpect(p.pid, true, 10, (err, running) => {
      expect(err).to.not.exist
      expect(running).to.be.ok

      p.kill('SIGTERM') // should not kill it

      psExpect(p.pid, true, 10, (err, running) => {
        expect(err).to.not.exist
        expect(running).to.be.ok

        p.kill('SIGKILL') // should kill it
        psExpect(p.pid, false, 15, (err, running) => {
          expect(err).to.not.exist
          expect(running).to.not.be.ok
          check()
        })
      })
    })
  })
})
