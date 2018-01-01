/* eslint no-console: 0 */
'use strict'

const IPFS = require('ipfs')

const DaemonFactory = require('ipfsd-ctl')

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
      console.log('alice')
      console.log(id)
      ipfsd.stop()
    })
  })

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
      console.log('bob')
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
      console.log('bob')
      console.log(id)
      ipfsd.stop(() => process.exit(0))
    })
  })
