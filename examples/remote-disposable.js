/* eslint no-console: 0 */
'use strict'

// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

// IPFS_PATH will point to /tmp/ipfs_***** and will be
// cleaned up when the process exits.

const ipfsd = require('../')
const server = ipfsd.server

server.start((err) => {
  if (err) {
    throw err
  }

  const remoteController = ipfsd.remoteController()
  remoteController.spawn(function (err, controller) {
    const ipfs = controller.ctl
    const node = controller.ctrl
    ipfs.id(function (err, id) {
      console.log(id)
      node.stopDaemon(() => server.stop())
    })
  })
})