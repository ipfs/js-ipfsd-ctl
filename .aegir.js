import * as ipfsModule from 'ipfs'
import * as ipfsHttpModule from 'ipfs-http-client'
import * as goIpfsModule from 'go-ipfs'

/** @type {import('aegir').Options["build"]["config"]} */
const config = {
  bundlesize: {
    maxSize: '35kB'
  },
  test: {
    before: async () => {
      const { createServer } = await import('./dist/src/index.js')

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

export default config
