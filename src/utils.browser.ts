import { nanoid } from 'nanoid'

const deleteDb = async (path: string): Promise<void> => {
  return await new Promise((resolve, reject) => {
    const keys = self.indexedDB.deleteDatabase(path)
    keys.onerror = (err) => reject(err)
    keys.onsuccess = () => resolve()
  })
}

/**
 * close repoPath , repoPath/keys, repoPath/blocks and repoPath/datastore
 */
export const removeRepo = async (repoPath: string): Promise<void> => {
  await deleteDb(repoPath)
  await deleteDb(repoPath + '/keys')
  await deleteDb(repoPath + '/blocks')
  await deleteDb(repoPath + '/datastore')
}

/**
 * @param {string} repoPath
 */
export const repoExists = async (repoPath: string): Promise<boolean> => {
  return await new Promise((resolve, reject) => {
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

export const defaultRepo = (): string => {
  return 'ipfs'
}

export const checkForRunningApi = (): string | null => {
  return null
}

export const tmpDir = (type = ''): string => {
  return `${type}_ipfs_${nanoid()}`
}
