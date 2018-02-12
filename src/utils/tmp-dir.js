'use strict'

const os = require('os')
const path = require('path')
const hat = require('hat')

module.exports = (isJs) => {
  return path.join(os.tmpdir(), `${isJs ? 'jsipfs' : 'ipfs'}_${hat()}`)
}
