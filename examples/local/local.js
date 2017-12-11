/* eslint no-console: 0 */
'use strict'

const factory = require('ipfsd-ctl')
const localController = factory.localController

// opens an api connection to local running go-ipfs node
localController.spawn({ disposable: false }, (err, ipfsd) => {
  if (err) {
    throw err
  }

  const ipfs = ipfsd.ctl
  const node = ipfsd.ctrl
  ipfs.id(function (err, id) {
    if (err) {
      throw err
    }

    console.log('go-ipfs')
    console.log(id)
    node.stopDaemon()
  })
})

// opens an api connection to local running js-ipfs node
localController.spawn({ isJs: true, disposable: false }, (err, ipfsd) => {
  if (err) {
    throw err
  }

  const ipfs = ipfsd.ctl
  const node = ipfsd.ctrl
  ipfs.id(function (err, id) {
    if (err) {
      throw err
    }

    console.log('js-ipfs')
    console.log(id)
    node.stopDaemon()
  })
})
