'use strict'

// Start a disposable node, and get access to the api
// print the node id, and kill the temporary daemon

// IPFS_PATH will point to /tmp/ipfs_***** and will be
// cleaned up when the process exits.

const ipfsd = require('ipfsd-ctl')

ipfsd.disposableApi((err, ipfs) => {
  if (err) throw err
  ipfs.id((err, id) => {
    if (err) throw err
    console.log(id)
  })
})
