'use strict'

const execa = require('execa')

function exec (cmd, args, opts, handlers) {
  opts = opts || {}
  let err = ''
  let result = ''
  let callback
  // Handy method if we just want the result and err returned in a callback
  if (typeof handlers === 'function') {
    callback = handlers
    handlers = {
      error: callback,
      data: (data) => {
        result += data
      },
      done: () => {
        if (err) return callback(new Error(err))
        callback(null, result)
      }
    }
  }

  // The listeners that will actually be set on the process
  const listeners = {
    data: handlers.data,
    error: (data) => {
      err += data
    },
    done: (code) => {
      if (code !== 0) {
        return handlers.error(
          new Error(`non-zero exit code ${code}\n
            while running: ${cmd} ${args.join(' ')}\n\n
            ${err}`)
        )
      }
      if (handlers.done) handlers.done()
    }
  }

  const command = execa(cmd, args, opts)

  if (listeners.data) command.stdout.on('data', listeners.data)

  command.stderr.on('data', listeners.error)

  // If command fails to execute return directly to the handler
  command.on('error', handlers.error)

  command.on('close', listeners.done)

  return command
}

module.exports = exec
