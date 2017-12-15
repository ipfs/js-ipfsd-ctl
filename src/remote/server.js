'use strict'

const Hapi = require('hapi')
const routes = require('./routes')

let server = null
exports.start = function start (port, cb) {
  if (typeof port === 'function') {
    cb = port
    port = 9999
  }

  port = port || 9999

  server = new Hapi.Server()
  server.connection({ port, host: 'localhost', routes: { cors: true } })

  routes(server)
  server.start(cb)
}

exports.stop = function stop (cb) {
  cb = cb || (() => {})
  server.stop(cb)
}
