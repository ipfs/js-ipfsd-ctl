/* global self */
'use strict'

const Dexie = require('dexie').default
const setImmediate = require('async/setImmediate')

exports.removeRepo = function removeRepo (repoPath, callback) {
  Dexie.delete(repoPath)
  setImmediate(callback)
}

exports.repoExists = function repoExists (repoPath, cb) {
  const db = new Dexie(repoPath)
  db.open(repoPath)
    .then((store) => {
      const table = store.table(repoPath)
      return table
        .count((cnt) => cb(null, cnt > 0))
        .catch(e => cb(null, false))
    }).catch(e => cb(null, false))
}

exports.defaultRepo = function (type) {
  return 'ipfs'
}

exports.checkForRunningApi = function (path) {
  return null
}
