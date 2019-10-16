'use strict'

const os = require('os')
const path = require('path')
const hat = require('hat')

module.exports = (type) => {
  return path.join(os.tmpdir(), `${type === 'js' ? 'jsipfs' : 'ipfs'}_${hat()}`)
}
