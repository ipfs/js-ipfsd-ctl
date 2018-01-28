'use strict'

const runner = require('child_process')
const debug = require('debug')('subchild')

const children = []

function removeChild (child) {
  const i = children.indexOf(child)
  if (i !== -1) {
    children.slice(i, 1)
  }
}

function killAll () {
  debug('killing all children')
  let child
  while ((child = children.shift()) !== undefined) {
    debug(child.pid, 'killing')
    child.kill()
  }
}

process.once('error', killAll)
process.once('exit', killAll)
process.once('SIGTERM', killAll)
process.once('SIGINT', killAll)

function run (cmd, args, opts) {
  const child = runner.execFile(cmd, args, opts)
  debug(child.pid, 'new')

  children.push(child)
  child.once('error', () => {
    debug(child.pid, 'error')
    removeChild(child)
  })
  child.once('exit', () => {
    debug(child.pid, 'exit')
    removeChild(child)
  })
  return child
}

module.exports = run
