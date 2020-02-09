'use strict'

const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const debug = require('debug')
const nanoid = require('nanoid')

const log = debug('ipfsd-ctl:utils')

const removeRepo = async (repoPath) => {
  try {
    await fs.remove(repoPath)
  } catch (err) {
    // ignore
  }
}

const repoExists = async (repoPath) => {
  const exists = await fs.pathExists(path.join(repoPath, 'config'))
  return exists
}

const defaultRepo = (type) => {
  return path.join(
    os.homedir(),
    type === 'js' || type === 'proc' ? '.jsipfs' : '.ipfs'
  )
}

const checkForRunningApi = (repoPath) => {
  let api
  try {
    api = fs.readFileSync(path.join(repoPath, 'api'))
  } catch (err) {
    log('Unable to open api file')
  }

  return api ? api.toString() : null
}

const tmpDir = (type = '') => {
  return path.join(os.tmpdir(), `${type}_ipfs_${nanoid()}`)
}

module.exports = {
  removeRepo,
  repoExists,
  defaultRepo,
  checkForRunningApi,
  tmpDir
}
