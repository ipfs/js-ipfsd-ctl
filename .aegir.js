'use strict'

const createServer = require('./src').createServer

const server = createServer() // using defaults
module.exports = {
  bundlesize: { maxSize: '940kB' },
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
  },
  webpack: process.env.NODE_ENV === 'test' ? undefined : {
    externals: {
      ipfs: 'ipfs',
      'ipfs-http-client': 'ipfs-http-client',
      'go-ipfs-dep': 'go-ipfs-dep'
    }
  }
}
