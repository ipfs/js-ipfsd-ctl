'use strict'

const protobuf = require('protons')
const pbm = protobuf(require('libp2p-crypto/src/keys/keys.proto'))

const ids = shuffle(require('./ids.json').split('"')) // file can be generated using mkg20001/test-peer-ids.tk patched with ipfs://QmVZRWjZoqve9UKgng2gymN8a3FQUENgsQaicQ2fWs7kGx
const base = require('base-x')(' !#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~') // "compression" aka "whatever part of ascii can be put into a JSON string without needing to get escaped"-base

/**
 * Shuffles array in place.
 * Credit: https://stackoverflow.com/a/6274381/3990041
 * @param {Array} a An array containing the items.
 * @returns {Array}
 */
function shuffle (a) {
  let j, x, i
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = a[i]
    a[i] = a[j]
    a[j] = x
  }
  return a
}

module.exports = () => {
  if (!ids.length) { // TODO: should this maybe re-use ids?
    throw new Error('Ran out of pregenerated IDs! What do you even need this many for?')
  }

  return pbm.PublicKey.encode({ // this is needed because the keys aren't wrapped in the usual privateKey pbuf container to save space
    Type: pbm.KeyType.RSA,
    Data: base.decode(ids.pop())
  }).toString('base64')
}
