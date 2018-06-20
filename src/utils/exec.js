'use strict'

const run = require('subcomandante')
const once = require('once')
const debug = require('debug')
const log = debug('ipfsd-ctl:exec')
const path = require('path')
const noop = () => {}

function exec (cmd, args, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  }

  callback = once(callback)

  opts = Object.assign({}, {
    stdout: noop,
    stderr: noop
  }, opts)

  const done = (code) => {
    // if process exits with non-zero code, subcomandante will cause
    // an error event to be emitted which will call the passed
    // callback so we only need to handle the happy path
    if (code === 0) {
      callback()
    }
  }

  log(path.basename(cmd), args.join(' '))

  const command = run(cmd, args, opts)
  command.on('error', callback)
  command.on('close', done)
  command.on('exit', done)
  command.stdout.on('data', opts.stdout)
  command.stderr.on('data', opts.stderr)

  return command
}

module.exports = exec
