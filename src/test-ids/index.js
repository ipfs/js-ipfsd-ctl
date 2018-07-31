'use strict'

const Ids = require('./ids.json').split('"') // file can be generated using mkg20001/test-peer-ids.tk patched with ipfs://QmVZRWjZoqve9UKgng2gymN8a3FQUENgsQaicQ2fWs7kGx
const Id = require('peer-id')
const loadKey = require('libp2p-crypto').keys.supportedKeys.rsa.unmarshalRsaPrivateKey // this is needed because the keys aren't wrapped in the usual privateKey pbuf container to save space
const base = require('base-x')(' !#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~') // "compression" aka "whatever part of ascii can be put into a JSON string without needing to get escaped"-base
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

module.exports = (cb) => {
  loadKey(base.decode(Ids[rand(0, Ids.length)]), (err, key) => {
    if (err) { return cb(err) }
    key.hash((err, digest) => {
      if (err) { return cb(err) }
      cb(null, new Id(digest, key, key.public))
    })
  })
}
