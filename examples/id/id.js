/* eslint no-console: 0 */
'use strict'

const controllerFactory = require('ipfsd-ctl')
const daemonFactory = controllerFactory()

daemonFactory.spawn(function (err, ipfsd) {
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

daemonFactory.spawn(function (err, ipfsd) {
  if (err) {
    throw err
  }

  const ipfsCtl = ipfsd.ctl
  const ipfsCtrl = ipfsd.ctrl
  ipfsCtl.id(function (err, id) {
    if (err) {
      throw err
    }
    console.log('bob')
    console.log(id)
    ipfsCtrl.stopDaemon()
  })
})
