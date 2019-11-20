'use strict'
const nanoid = require('nanoid')

const deleteDb = (path) => {
  return new Promise((resolve, reject) => {
    const keys = self.indexedDB.deleteDatabase(path)
    keys.onblocked = () => reject(new Error('Database is still open.'))
    keys.onerror = (err) => reject(err)
    keys.onsuccess = () => resolve()
  })
}

/**
 * close repoPath , repoPath/keys, repoPath/blocks and repoPath/datastore
 * @param {string} repoPath
 */
const removeRepo = async (repoPath) => {
  const path = `level-js-${repoPath}`
  await deleteDb(path)
  await deleteDb(path + '/keys')
  await deleteDb(path + '/blocks')
  await deleteDb(path + '/datastore')
}

const repoExists = (repoPath) => {
  const path = `level-js-${repoPath}`
  return new Promise((resolve, reject) => {
    var req = self.indexedDB.open(path)
    var existed = true
    req.onerror = () => reject(req.error)
    req.onsuccess = function () {
      req.result.close()
      if (!existed) { self.indexedDB.deleteDatabase(path) }
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

const findBin = (type) => {
}

const tmpDir = (type = '') => {
  return `${type}_ipfs_${nanoid()}`
}

module.exports = {
  removeRepo,
  repoExists,
  defaultRepo,
  checkForRunningApi,
  findBin,
  tmpDir
}
