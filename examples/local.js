'use strict'

var ipfsd = require('../')

// opens an api connection to local running ipfs node

ipfsd.local(function (err, ipfs) {
  if (err) throw err

  console.log(ipfs)
})
