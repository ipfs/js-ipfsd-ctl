'use strict'

const os = require('os')
const isWindows = os.platform() === 'win32'

module.exports = (type) => {
  if (type === 'js') {
    return process.env.IPFS_JS_EXEC || require.resolve('ipfs/src/cli/bin.js')
  }

  if (type === 'go') {
    return process.env.IPFS_GO_EXEC || require.resolve(`go-ipfs-dep/go-ipfs/${isWindows ? 'ipfs.exe' : 'ipfs'}`)
  }
}
