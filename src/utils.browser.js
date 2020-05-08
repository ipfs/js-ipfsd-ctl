'use strict'
const { nanoid } = require('nanoid')

const deleteDb = (path, retries = 1) => {
  return new Promise((resolve, reject) => {
    const keys = self.indexedDB.deleteDatabase(path)
    keys.onblocked = () => {
      if (retries === 6) {
        reject(new Error('Database is still open.'))
        return
      }

      setTimeout(() => {
        deleteDb(path, retries++)
          .then(resolve, reject)
      }, retries * 1000)
    }
    keys.onerror = (err) => reject(err)
    keys.onsuccess = () => resolve()
  })
}

/**
 * close repoPath , repoPath/keys, repoPath/blocks and repoPath/datastore
 * @param {string} repoPath
 */
const removeRepo = async (repoPath) => {
  await deleteDb(repoPath)
  await deleteDb(repoPath + '/keys')
  await deleteDb(repoPath + '/blocks')
  await deleteDb(repoPath + '/datastore')
}

const repoExists = (repoPath) => {
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

const defaultRepo = (type) => {
  return 'ipfs'
}

const checkForRunningApi = (path) => {
  return null
}

const tmpDir = (type = '') => {
  return `${type}_ipfs_${nanoid()}`
}

module.exports = {
  removeRepo,
  repoExists,
  defaultRepo,
  checkForRunningApi,
  tmpDir
}
