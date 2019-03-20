'use strict'

const hat = require('hat')
const Dexie = require('dexie').default
const setImmediate = require('async/setImmediate')

function createTempRepoPath () {
  return '/ipfs-' + hat()
}

function removeRepo (repoPath, callback) {
  Dexie.delete(repoPath)
  setImmediate(callback)
}

function repoExists (repoPath, cb) {
  const db = new Dexie(repoPath)
  db.open(repoPath)
    .then((store) => {
      const table = store.table(repoPath)
      return table
        .count((cnt) => cb(null, cnt > 0))
        .catch(cb)
    }).catch(cb)
}

module.exports = {
  createTempRepoPath,
  removeRepo,
  repoExists
}
