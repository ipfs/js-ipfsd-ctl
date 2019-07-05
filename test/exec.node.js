/* eslint max-nested-callbacks: ["error", 6] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const isrunning = require('is-running')
const path = require('path')
const exec = require('../src/utils/exec')
const os = require('os')
const delay = require('delay')

const isWindows = os.platform() === 'win32'

const survivor = path.join(__dirname, 'survivor')

function token () {
  return Math.random().toString().substr(2)
}

async function psExpect (pid, shouldBeRunning, grace) {
  await delay(200)

  const actual = isrunning(pid)

  if (actual !== shouldBeRunning && grace > 0) {
    return psExpect(pid, shouldBeRunning, --grace)
  }

  return actual
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

  it('captures stderr and stdout', async () => {
    let stdout = ''
    let stderr = ''

    await exec(process.execPath, [
      path.resolve(path.join(__dirname, 'fixtures', 'talky.js'))
    ], {
      stdout: (data) => {
        stdout += String(data)
      },
      stderr: (data) => {
        stderr += String(data)
      }
    })

    expect(stdout).to.equal('hello\n')
    expect(stderr).to.equal('world\n')
  })

  it('survives process errors and captures exit code and stderr', async () => {
    try {
      await exec(process.execPath, [
        path.resolve(path.join(__dirname, 'fixtures', 'error.js'))
      ])
      expect.fail('Should have errored')
    } catch (err) {
      expect(err.exitCode).to.equal(1)
      expect(err.stderr).to.contain('Goodbye cruel world!')
    }
  })

  it('SIGTERM kills hang', async () => {
    const tok = token()
    const hang = 'tail -f /dev/null'.split(' ')
    const args = hang.concat(tok)
    const p = exec(args[0], args.slice(1))

    let running = await psExpect(p.pid, true, 10)
    expect(running).to.be.ok()

    p.kill('SIGTERM') // should kill it

    running = await psExpect(p.pid, false, 10)
    expect(running).to.not.be.ok()

    try {
      await p
      expect.fail('Should have errored')
    } catch (err) {
      expect(err.killed).to.be.ok()
      expect(err.signal).to.equal('SIGTERM')
    }
  })

  it('SIGKILL kills survivor', async () => {
    const tok = token()
    const p = exec(survivor, [tok], {})

    let running = await psExpect(p.pid, true, 10)
    expect(running).to.be.ok()

    // should not kill it
    p.kill('SIGTERM')

    running = await psExpect(p.pid, true, 10)
    expect(running).to.be.ok()

    // will kill it
    p.kill('SIGKILL')

    running = await psExpect(p.pid, false, 50)
    expect(running).to.not.be.ok()

    try {
      await p
      expect.fail('Should have errored')
    } catch (err) {
      expect(err.killed).to.be.ok()
      expect(err.signal).to.equal('SIGKILL')
    }
  })
})
