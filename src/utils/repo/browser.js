/* global self */
'use strict'

const hat = require('hat')

function createTempRepoPath () {
  return '/ipfs-' + hat()
}

function removeRepo (repoPath, cb) {
  const req = self.indexedDB.deleteDatabase(repoPath)
  req.onerror = () => { cb(req.error) }
  req.onblocked = (e) => {
    cb(new Error('Request blocked but another connection.'))
  }
  req.onsuccess = (e) => {
    if (!e.result) {
      cb()
    } else {
      cb(new Error('Error removing repo.'))
    }
  }
}

function repoExists (repoPath, cb) {
  var req = self.indexedDB.open(repoPath)
  var existed = true
  req.onerror = () => cb(req.error)
  req.onsuccess = function () {
    req.result.close()
    if (!existed) { self.indexedDB.deleteDatabase(repoPath) }
    cb(null, existed)
  }
  req.onupgradeneeded = function () {
    existed = false
  }
}

module.exports = {
  createTempRepoPath,
  removeRepo,
  repoExists
}
