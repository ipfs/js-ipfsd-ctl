'use strict'

const runner = require('child_process')
const debug = require('debug')
const log = debug('ipfsd-ctl:sclite')

const children = []

function removeChild (child) {
  const i = children.indexOf(child)
  if (i !== -1) {
    children.slice(i, 1)
  }
}

function killAll () {
  log('killing all children')
  let child
  while ((child = children.shift()) !== undefined) {
    log(child.pid, 'killing')
    child.kill()
  }
}

process.once('exit', killAll)
process.once('SIGTERM', killAll)
process.once('SIGINT', killAll)

function run (cmd, args, opts) {
  const child = runner.execFile(cmd, args, opts)
  log(child.pid, 'new')

  children.push(child)
  child.once('error', () => {
    log(child.pid, 'error')
    removeChild(child)
  })
  child.once('exit', () => {
    log(child.pid, 'exit')
    removeChild(child)
  })
  return child
}

module.exports = run
