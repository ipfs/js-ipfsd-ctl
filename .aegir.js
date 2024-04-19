import { create } from 'kubo-rpc-client'
import { path } from 'kubo'

/** @type {import('aegir').PartialOptions} */
const config = {
  build: {
    bundlesizeMax: '2.5kB',
  },
  test: {
    before: async () => {
      const { createServer } = await import('./dist/src/index.js')

      const server = createServer(undefined, {
          type: 'kubo',
          bin: path(),
          rpc: create
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
