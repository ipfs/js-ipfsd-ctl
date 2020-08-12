'use strict'

const getPort = require('aegir/utils/get-port')
const createServer = require('./src').createServer

const server = createServer(undefined,
  {
    ipfsModule: require('ipfs'),
    ipfsHttpModule: require('ipfs-http-client')
  },
  {
    go: {
      ipfsBin: require('go-ipfs').path()
    },
    js: {
      ipfsBin: require.resolve('ipfs/src/cli/bin.js')
    }
  }
)

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
      pre: async () => {
        await server.start(await getPort(server.port, server.host))
        return {
          env: {
            IPFSD_CTL_SERVER: `http://${server.host}:${server.port}`
          }
        }
      },
      post: () => server.stop()
  },
  webpack: {
    node: {
      // needed by ipfs-repo-migrations
      path: true,

      // needed by abstract-leveldown
      Buffer: true
    }
  }
}
