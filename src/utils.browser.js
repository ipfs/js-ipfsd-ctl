import { nanoid } from 'nanoid'

/**
 * @param {string} path
 * @returns {Promise<void>}
 */
const deleteDb = (path) => {
  return new Promise((resolve, reject) => {
    const keys = self.indexedDB.deleteDatabase(path)
    keys.onerror = (err) => reject(err)
    keys.onsuccess = () => resolve()
  })
}

/**
 * close repoPath , repoPath/keys, repoPath/blocks and repoPath/datastore
 *
 * @param {string} repoPath
 */
export const removeRepo = async (repoPath) => {
  await deleteDb(repoPath)
  await deleteDb(repoPath + '/keys')
  await deleteDb(repoPath + '/blocks')
  await deleteDb(repoPath + '/datastore')
}

/**
 * @param {string} repoPath
 */
export const repoExists = (repoPath) => {
  return new Promise((resolve, reject) => {
    const req = self.indexedDB.open(repoPath)
    let existed = true
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

export const defaultRepo = () => {
  return 'ipfs'
}

export const checkForRunningApi = () => {
  return null
}

export const tmpDir = (type = '') => {
  return `${type}_ipfs_${nanoid()}`
}
