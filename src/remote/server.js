'use strict'

const Hapi = require('hapi')
const routes = require('./routes')

class Server {
  constructor (port) {
    this.server = null
    this.port = typeof port === 'undefined' ? 9999 : port
  }

  start (cb) {
    cb = cb || (() => {})

    this.server = new Hapi.Server()
    this.server.connection({ port: this.port, host: 'localhost', routes: { cors: true } })

    routes(this.server)
    this.server.start((err) => {
      if (err) {
        return cb(err)
      }

      cb(null, this.server)
    })
  }

  stop (cb) {
    cb = cb || (() => {})
    this.server.stop(cb)
  }
}

module.exports = Server
