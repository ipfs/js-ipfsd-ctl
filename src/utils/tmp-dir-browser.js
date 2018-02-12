'use strict'

const hat = require('hat')

module.exports = (isJs) => {
  return (isJs
    ? 'jsipfs_'
    : 'ipfs_'
  ) + hat()
}
