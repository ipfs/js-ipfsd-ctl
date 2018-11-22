'use strict'

const debug = require('debug')
const log = debug('ipfsd-ctl:exec')
const path = require('path')
const execa = require('execa')
const noop = () => {}

function exec (cmd, args, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  }

  opts = Object.assign({}, {
    stdout: noop,
    stderr: noop
  }, opts)

  log(path.basename(cmd), args.join(' '))
  const command = execa(cmd, args, { env: opts.env })
  command.stderr.on('data', opts.stderr)
  command.stdout.on('data', opts.stdout)
  command
    .then(r => {
      callback(null, r)
    })
    .catch(err => {
      callback(err)
    })

  return command
}

module.exports = exec
