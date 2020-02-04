'use strict'

const createServer = require('./src').createServer
const { findBin } = require('./src/utils')

const server = createServer(null, {
  ipfsModule: {
    path: require.resolve('ipfs'),
    ref: require('ipfs')
  },
  ipfsHttpModule: {
    path: require.resolve('ipfs-http-client'),
    ref: require('ipfs-http-client')
  }
}, {
  go: {
    ipfsBin: findBin('go', true)
  },
  js: {
    ipfsBin: findBin('js', true)
  }
}) // using defaults
module.exports = {
  bundlesize: { maxSize: '35kB' },
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
