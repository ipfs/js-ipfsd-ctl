/* eslint no-console: 0 */
'use strict'

// Start a disposable node, and get access to the api
// print the node id

const DaemonFactory = require('ipfsd-ctl')
const df = DaemonFactory.create()

// start a go daemon
df.spawn((err, ipfsd) => {
  if (err) {
    throw err
  }

  const ipfsCtl = ipfsd.ctl
  const ipfsCtrl = ipfsd.ctrl
  ipfsCtl.id(function (err, id) {
    if (err) {
      throw err
    }

    console.log('go-ipfs')
    console.log(id)
    ipfsCtrl.stopDaemon()
  })
})

// start a js daemon
df.spawn({ isJs: true }, (err, ipfsd) => {
  if (err) {
    throw err
  }

  const ipfsCtl = ipfsd.ctl
  const ipfsCtrl = ipfsd.ctrl
  ipfsCtl.id(function (err, id) {
    if (err) {
      throw err
    }

    console.log('js-ipfs')
    console.log(id)
    ipfsCtrl.stopDaemon()
  })
})
