/* eslint no-console: 0 */
'use strict'

// Start a non disposable nodes (default to .ipfs and .jsipfs)

const DaemonFactory = require('ipfsd-ctl')

// start a go daemon
DaemonFactory
  .create({ type: 'go' })
  .spawn({
    disposable: false
  }, (err, ipfsd) => {
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
  .spawn({
    disposable: false
  }, (err, ipfsd) => {
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
