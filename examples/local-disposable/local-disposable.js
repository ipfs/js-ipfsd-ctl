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

  ipfsd.api.id((err, id) => {
    if (err) {
      throw err
    }

    console.log('go-ipfs')
    console.log(id)
    ipfsd.stop()
  })
})

// start a js daemon
df.spawn({ type: 'js' }, (err, ipfsd) => {
  if (err) {
    throw err
  }

  ipfsd.api.id((err, id) => {
    if (err) {
      throw err
    }

    console.log('js-ipfs')
    console.log(id)
    ipfsd.stop()
  })
})
