/* eslint no-console: 0 */
'use strict'

const factory = require('../')
const localController = factory.localController

// opens an api connection to local running ipfs node

localController.spawn({ disposable: false }, (err, ipfsd) => {
    const ipfs = ipfsd.ctl
    const node = ipfsd.ctrl
    ipfs.id(function (err, id) {
      console.log('go-ipfs')
      console.log(id)
      node.stopDaemon()
    })
  }
)
