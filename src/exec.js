'use strict'

const execa = require('execa')

function exec (cmd, args, opts, handlers) {
  let err = ''
  const listeners = {
    data: handlers.data,
    error: (data) => {
      err += data
    },
    done: (code) => {
      if (code !== 0) {
        return handlers.error(new Error(
          'non-zero exit code ' + code +
          '\n  while running: ' + cmd + ' ' + args.join(' ') +
          '\n\n  ' + err))
      }
      if (handlers.end) handlers.end()
    }
  }

  const command = execa(cmd, args, opts)

  command.stdout.on('data', listeners.data)

  command.stderr.on('data', listeners.error)

  command.on('error', handlers.error)

  command.on('close', listeners.done)

  return command
}

module.exports = exec
