/* eslint no-console: 0 */
'use strict'

const DaemonFactory = require('ipfsd-ctl')
const df = DaemonFactory.create()

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

df.spawn((err, ipfsd) => {
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
