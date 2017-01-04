/* eslint max-nested-callbacks: ["error", 6] */
/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const isrunning = require('is-running')
const cp = require('child_process')
const path = require('path')
const exec = require('../src/exec')

const survivor = path.join(__dirname, 'survivor')

function token () {
  return Math.random().toString().substr(2)
}

function psExpect (pid, expect, grace, callback) {
  setTimeout(() => {
    const actual = isrunning(pid)

    if (actual !== expect && grace > 0) {
      return psExpect(pid, expect, --grace, callback)
    }

    callback(null, actual)
  }, 200)
}

function isRunningGrep (pattern, callback) {
  const cmd = 'ps aux'
  cp.exec(cmd, (err, stdout, stderr) => {
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

describe('exec', () => {
  it('SIGTERM kills hang', (done) => {
    const tok = token()

    const check = makeCheck(2, done)
    const hang = 'tail -f /dev/null'.split(' ')
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

  // Travis and CircleCI don't like the usage of SIGHUP
  if (process.env.CI) {
    return
  }

  it('SIGKILL kills survivor', (done) => {
    const check = makeCheck(2, done)

    const tok = token()

    const p = exec(survivor, [tok], {}, (err) => {
      expect(err).to.not.exist

      isRunningGrep(token, (err, running) => {
        expect(err).to.not.exist
        expect(running).to.not.be.ok
        check()
      })
    })

    psExpect(p.pid, true, 10, (err, running) => {
      expect(err).to.not.exist
      expect(running).to.be.ok

      // should not kill it
      p.kill('SIGTERM')

      psExpect(p.pid, true, 10, (err, running) => {
        expect(err).to.not.exist
        expect(running).to.be.ok

        // will kill it
        p.kill('SIGKILL')

        psExpect(p.pid, false, 50, (err, running) => {
          expect(err).to.not.exist
          expect(running).to.not.be.ok
          check()
        })
      })
    })
  })
})
