'use strict'

const os = require('os')
const isWindows = os.platform() === 'win32'
const exec = require('./exec')

module.exports = (node, args, opts, callback) => {
  let executable = node.exec

  if (isWindows && executable.endsWith('.js')) {
    args = args || []
    args.unshift(node.exec)
    executable = process.execPath
  }

  // Don't pass on arguments that were passed into the node executable
  opts.execArgv = []

  return exec(executable, args, opts, callback)
}
