import { createServer } from './src/index.js'
import * as ipfsModule from 'ipfs'
import * as ipfsHttpModule from 'ipfs-http-client'
import * as goIpfsModule from 'go-ipfs'

/** @type {import('aegir').Options["build"]["config"]} */
/*
const esbuild = {
  inject: [path.join(__dirname, 'scripts/node-globals.js')],
}
*/
export default {
  bundlesize: {
    maxSize: '35kB'
  },
  test: {
    browser: {
      config: {
        //buildConfig: esbuild
      }
    },
    before: async () => {
      const server = createServer(undefined, {
          ipfsModule,
          ipfsHttpModule
        }, {
          go: {
            ipfsBin: goIpfsModule.path()
          },
          js: {
            ipfsBin: ipfsModule.path()
          }
        }
      )

      await server.start()

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
