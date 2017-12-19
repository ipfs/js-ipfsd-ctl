/* eslint no-console: 0 */
'use strict'

const DaemonFactory = require('ipfsd-ctl')
const df = DaemonFactory.create()

// opens an api connection to local running go-ipfs node
df.spawn({ disposable: true }, (err, ipfsd) => {
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

// opens an api connection to local running js-ipfs node
df.spawn({ type: 'js', disposable: true }, (err, ipfsd) => {
  if (err) {
    throw err
  }

  ipfsd.api.id(function (err, id) {
    if (err) {
      throw err
    }

    console.log('js-ipfs')
    console.log(id)
    ipfsd.stop()
  })
})
