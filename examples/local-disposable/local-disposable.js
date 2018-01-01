/* eslint no-console: 0 */
'use strict'

// Start a disposable node, and get access to the api
// print the node id

const IPFS = require('ipfs')

const DaemonFactory = require('ipfsd-ctl')

// start a go daemon
DaemonFactory
  .create({ type: 'go' })
  .spawn((err, ipfsd) => {
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
DaemonFactory
  .create({ type: 'js' })
  .spawn((err, ipfsd) => {
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

DaemonFactory
  .create({ type: 'proc' })
  .spawn({ exec: IPFS }, (err, ipfsd) => {
    if (err) {
      throw err
    }

    ipfsd.api.id((err, id) => {
      if (err) {
        throw err
      }

      console.log('js-ipfs')
      console.log(id)
      ipfsd.stop(() => process.exit(0))
    })
  })
