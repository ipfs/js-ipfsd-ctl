'use strict'

const Hapi = require('hapi')
const routes = require('./routes')

class Server {
  constructor (port) {
    this.server = null
    this.port = port || 9999
  }

  start (cb) {
    cb = cb || (() => {})

    this.server = new Hapi.Server()
    this.server.connection({ port: this.port, host: 'localhost', routes: { cors: true } })

    routes(this.server)
    this.server.start(cb)
  }

  stop (cb) {
    cb = cb || (() => {})
    this.server.stop(cb)
  }
}

module.exports = Server
