'use strict'

function removeRepo (repoPath) {
  self.indexedDB.deleteDatabase(repoPath)
  return Promise.resolve()
}

function repoExists (repoPath) {
  return new Promise((resolve, reject) => {
    var req = self.indexedDB.open(repoPath)
    var existed = true
    req.onerror = () => reject(req.error)
    req.onsuccess = function () {
      req.result.close()
      if (!existed) { self.indexedDB.deleteDatabase(repoPath) }
      resolve(existed)
    }
    req.onupgradeneeded = function () {
      existed = false
    }
  })
}

function defaultRepo (type) {
  return 'ipfs'
}

function checkForRunningApi (path) {
  return null
}

module.exports = {
  removeRepo,
  repoExists,
  defaultRepo,
  checkForRunningApi
}
