'use strict'

const run = require('subcomandante')
const once = require('once')
const debug = require('debug')
const log = debug('ipfsd-ctl:exec')

const path = require('path')

function exec (cmd, args, opts, handlers, callback) {
  opts = opts || {}
  let err = ''
  let result = ''

  // Handy method if we just want the result and err returned in a callback
  if (typeof handlers === 'function') {
    callback = once(handlers)

    handlers = {
      error: callback,
      data (data) {
        result += data
      },
      done () {
        if (err) {
          return callback(new Error(err))
        }
        callback(null, result.trim())
      }
    }
  }

  // The listeners that will actually be set on the process
  const listeners = {
    data: handlers.data,
    error (data) {
      err += data
    },
    done: once((code) => {
      if (typeof code === 'number' && code !== 0) {
        return handlers.error(
          new Error(`non-zero exit code ${code}\n
            while running: ${cmd} ${args.join(' ')}\n\n
            ${err}`)
        )
      }
      if (handlers.done) {
        handlers.done()
      }
    })
  }

  log(path.basename(cmd), args.join(' '))
  const command = run(cmd, args, opts)

  if (listeners.data) {
    command.stdout.on('data', listeners.data)
  }

  command.stderr.on('data', listeners.error)

  // If command fails to execute return directly to the handler
  command.on('error', handlers.error)

  command.on('close', listeners.done)
  command.on('exit', listeners.done)

  return command
}

module.exports = exec
