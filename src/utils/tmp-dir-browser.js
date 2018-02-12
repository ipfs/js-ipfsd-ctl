'use strict'

const hat = require('hat')

module.exports = (isJs) => {
  return (isJs
    ? 'ipfs_'
    : 'jsipfs_'
  ) + hat()
}
