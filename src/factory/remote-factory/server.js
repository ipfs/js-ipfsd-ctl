'use strict'

const Hapi = require('hapi')
const routes = require('./routes')

const port = Number(process.env.PORT) || 55155
const options = {
  connections: {
    routes: {
      cors: true
    }
  }
}

function server (callback) {
  const http = new Hapi.Server(options)

  http.connection({ port: port })

  http.start((err) => {
    if (err) {
      return callback(err)
    }

    routes(http)

    callback(null, http)
  })
}

module.exports = server
