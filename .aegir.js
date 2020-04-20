'use strict'

const createServer = require('./src').createServer

const server = createServer(null, 
  {
    ipfsModule: require('ipfs'),
    ipfsHttpModule: require('ipfs-http-client')
  }, 
  {
    go: {
      ipfsBin: require('go-ipfs-dep').path()
    },
    js: {
      ipfsBin: require.resolve('ipfs/src/cli/bin.js')
    }
  }
)

module.exports = {
  bundlesize: { maxSize: '33kB' },
  karma: {
    files: [{
      pattern: 'test/fixtures/**/*',
      watched: false,
      served: true,
      included: false
    }]
  },
  hooks: {
      pre: async () => {
        await server.start()
        return {
          env: {
            IPFSD_CTL_SERVER: `http://localhost:${server.port}`
          }
        }
      },
      post: () => server.stop()
  }
}
