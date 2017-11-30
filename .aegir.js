'use strict'

const server = require('./src/remote/server')

module.exports = {
  karma: {
    files: [{
      pattern: 'test/fixtures/**/*',
      watched: false,
      served: true,
      included: false
    }],
    singleRun: true
  },
  hooks: {
    browser: {
      pre: server.start,
      post: server.stop
    }
  }
}
