/* eslint no-console: 0 */
'use strict'

// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const DaemonFactory = require('ipfsd-ctl')
const df = DaemonFactory.create({ remote: true })
const server = DaemonFactory.server

server.start((err) => {
  if (err) {
    throw err
  }

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

      console.log(id)
      ipfsCtrl.stopDaemon(() => server.stop())
    })
  })
})
