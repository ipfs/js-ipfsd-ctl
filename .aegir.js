'use strict'

const getPort = require('aegir/utils/get-port')
const createServer = require('./src').createServer

module.exports = {
  bundlesize: {
    maxSize: '35kB'
  },
  test: {
    before: async () => {
      const server = createServer(undefined, {
          ipfsModule: require('ipfs'),
          ipfsHttpModule: require('ipfs-http-client')
        }, {
          go: {
            ipfsBin: require('go-ipfs').path()
          },
          js: {
            ipfsBin: require.resolve('ipfs/src/cli.js')
          }
        }
      )

      await server.start(await getPort(server.port, server.host))
      return {
        env: {
          IPFSD_CTL_SERVER: `http://${server.host}:${server.port}`
        },
        server
      }
    },
    after: async (options, beforeResult) => {
      await beforeResult.server.stop()
    }
  }
}
