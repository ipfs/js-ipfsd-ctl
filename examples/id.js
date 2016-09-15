'use strict'

var ipfsd = require('../src')

ipfsd.disposableApi(function (err, ipfs) {
  if (err) throw err
  ipfs.id(function (err, id) {
    if (err) throw err
    console.log('alice')
    console.log(id)
  })
})

ipfsd.disposableApi(function (err, ipfs) {
  if (err) throw err
  ipfs.id(function (err, id) {
    if (err) throw err
    console.log('bob')
    console.log(id)
  })
})
