/* eslint no-console: 0 */
'use strict'

const factory = require('../')
const localController = factory.localController

localController.spawn(function (err, ipfsd) {
  if (err) {
    throw err
  }

  const ipfs = ipfsd.ctl
  const node = ipfsd.ctrl
  ipfs.id(function (err, id) {
    if (err) {
      throw err
    }
    console.log('alice')
    console.log(id)
    node.stopDaemon()
  })
})

localController.spawn(function (err, ipfsd) {
  if (err) {
    throw err
  }

  const ipfs = ipfsd.ctl
  const node = ipfsd.ctrl
  ipfs.id(function (err, id) {
    if (err) {
      throw err
    }
    console.log('bob')
    console.log(id)
    node.stopDaemon()
  })
})
