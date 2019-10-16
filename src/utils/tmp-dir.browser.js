'use strict'

const hat = require('hat')

module.exports = (type) => {
  return (type === 'js'
    ? 'jsipfs_'
    : 'ipfs_'
  ) + hat()
}
