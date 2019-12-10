'use strict'

const createServer = require('./src').createServer

const server = createServer() // using defaults
module.exports = {
  bundlesize: { maxSize: '920kB' },
  karma: {
    files: [{
      pattern: 'test/fixtures/**/*',
      watched: false,
      served: true,
      included: false
    }]
  },
  hooks: {
      pre: () => server.start(),
      post: () => server.stop()
  }
}
