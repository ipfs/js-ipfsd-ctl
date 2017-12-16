/* eslint no-console: 0 */
'use strict'

const DaemonFactory = require('ipfsd-ctl')
const df = DaemonFactory.create()

// opens an api connection to local running go-ipfs node
df.spawn({ disposable: false }, (err, ipfsd) => {
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

// opens an api connection to local running js-ipfs node
df.spawn({ isJs: true, disposable: false }, (err, ipfsd) => {
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
