/* eslint no-console: 0 */
'use strict'

const IPFS = require('ipfs')

const DaemonFactory = require('ipfsd-ctl')

// opens an api connection to local running go-ipfs node
DaemonFactory
  .create({ type: 'go' })
  .spawn({ disposable: true }, (err, ipfsd) => {
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

// creates an in-process running js-ipfs node
DaemonFactory
  .create({ type: 'proc' })
  .spawn({ disposable: true, exec: IPFS }, (err, ipfsd) => {
    if (err) {
      throw err
    }

    ipfsd.api.id(function (err, id) {
      if (err) {
        throw err
      }

      console.log('in-proc-ipfs')
      console.log(id)
      ipfsd.stop(() => process.exit(0))
    })
  })
