/* eslint no-console: 0 */
'use strict'

const controllerFactory = require('ipfsd-ctl')
const daemonFactory = controllerFactory()

// opens an api connection to local running go-ipfs node
daemonFactory.spawn({ disposable: false }, (err, ipfsd) => {
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
daemonFactory.spawn({ isJs: true, disposable: false }, (err, ipfsd) => {
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
