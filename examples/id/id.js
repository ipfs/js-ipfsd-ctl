/* eslint no-console: 0 */
'use strict'

const IPFS = require('ipfs')

const DaemonFactory = require('ipfsd-ctl')
const df = DaemonFactory.create({ remote: false })

df.spawn((err, ipfsd) => {
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

df.spawn({ type: 'js' }, (err, ipfsd) => {
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

df.spawn({ type: 'proc', exec: IPFS }, (err, ipfsd) => {
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
