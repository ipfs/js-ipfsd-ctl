import { createServer } from './src/index.js'
import * as ipfsModule from 'ipfs'
import * as ipfsHttpModule from 'ipfs-http-client'
import * as kuboRpcModule from 'kubo-rpc-client'
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
      /**
       * @type {import('./src/types.js').ControllerOptions}
       */
      let controllerOptions = {
        ipfsModule,
      }

      const server = createServer(undefined, controllerOptions, {
          go: {
            ipfsBin: goIpfsModule.path(),
            kuboRpcModule
          },
          js: {
            ipfsBin: ipfsModule.path(),
            ipfsHttpModule
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
