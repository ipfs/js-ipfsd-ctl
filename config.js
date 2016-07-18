'use strict'

const path = require('path')

const config = {
  version: 'v0.4.1', // ipfs dist version
  defaultExecPath: path.join(__dirname, '..', 'vendor'), // default path for the downloaded exec
  gracePeriod: 7500 // amount of ms to wait before sigkill
}

config.baseUrl = 'https://dist.ipfs.io/go-ipfs/' +
  config.version +
  '/go-ipfs_' +
  config.version + '_'

module.exports = config
