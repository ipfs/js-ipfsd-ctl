'use strict'

const path = require('path')
const getPort = require('aegir/utils/get-port')
const createServer = require('./src').createServer

/** @type {import('aegir').Options["build"]["config"]} */
const esbuild = {
  inject: [path.join(__dirname, 'scripts/node-globals.js')],
}

module.exports = {
  bundlesize: {
    maxSize: '35kB'
  },
  test: {
    browser: {
      config: {
        buildConfig: esbuild
      }
    },
    before: async () => {
      const server = createServer(undefined, {
          ipfsModule: require('ipfs'),
          ipfsHttpModule: require('ipfs-http-client')
        }, {
          go: {
            ipfsBin: require('go-ipfs').path()
          },
          js: {
            ipfsBin: require('ipfs').path()
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
