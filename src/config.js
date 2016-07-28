'use strict'

const path = require('path')

const config = {
  version: 'v0.4.3-rc1', // ipfs dist version
  defaultExecPath: path.join(__dirname, '..', 'vendor'), // default path for the downloaded exec
  gracePeriod: 7500 // amount of ms to wait before sigkill
}

const version = config.version
config.baseUrl = `https://dist.ipfs.io/go-ipfs/${version}/go-ipfs_${version}_`

module.exports = config
