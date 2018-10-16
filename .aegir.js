'use strict'

const createServer = require('./src').createServer

const server = createServer() // using defaults
module.exports = {
  karma: {
    customLaunchers: {
      ChromeDocker: {
        base: 'ChromeHeadless',
        // We must disable the Chrome sandbox when running Chrome inside Docker (Chrome's sandbox needs
        // more permissions than Docker allows by default)
        flags: ['--no-sandbox']
      }
    },
    client: {
      mocha: {
        bail: true,
      }
    },
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
      pre: server.start.bind(server),
      post: server.stop.bind(server)
    }
  }
}
