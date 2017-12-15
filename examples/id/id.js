/* eslint no-console: 0 */
'use strict'

const DaemonFactory = require('ipfsd-ctl')
const df = DaemonFactory.create()

df.spawn(function (err, ipfsd) {
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

df.spawn(function (err, ipfsd) {
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
