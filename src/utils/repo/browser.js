/* global self */
'use strict'

const hat = require('hat')
const Dexie = require('dexie')

exports.createTempRepoPath = function createTempPathRepo () {
  return '/ipfs-' + hat()
}

exports.removeRepo = function removeRepo (repoPath) {
  Dexie.delete(repoPath)
}

exports.repoExists = function repoExists (repoPath, cb) {
  const db = new Dexie(repoPath)
  db.open(repoPath)
    .then((store) => {
      const table = store.table(repoPath)
      return table
        .count((cnt) => cb(null, cnt > 0))
        .catch(cb)
    }).catch(cb)
}
