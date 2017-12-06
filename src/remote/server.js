'use strict'

const Hapi = require('hapi')
const routes = require('./routes')

let server = null
exports.start = function start (port, host, cb) {
  if (typeof port === 'function') {
    cb = port
    port = 9999
  }

  if (typeof host === 'function') {
    cb = host
    host = 'localhost'
  }

  port = port || 9999
  host = host || 'localhost'

  server = new Hapi.Server()
  server.connection({ port, host, routes: { cors: true } })

  routes(server)
  server.start(cb)
}

exports.stop = function stop (cb) {
  server.stop(cb)
}
