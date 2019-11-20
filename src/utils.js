'use strict'

const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const debug = require('debug')
const nanoid = require('nanoid')
const isWindows = os.platform() === 'win32'

const log = debug('ipfsd-ctl:utils')

const removeRepo = async (repoPath) => {
  try {
    await fs.remove(repoPath)
  } catch (err) {
    // ignore
  }
}

const repoExists = async (repoPath) => {
  const exists = await fs.pathExists(`${repoPath}/config`)
  return exists
}

const defaultRepo = (type) => {
  return path.join(
    os.homedir(),
    type === 'js' ? '.jsipfs' : '.ipfs'
  )
}

const checkForRunningApi = (path) => {
  let api
  try {
    api = fs.readFileSync(`${path}/api`)
  } catch (err) {
    log('Unable to open api file')
  }

  return api ? api.toString() : null
}

const findBin = (type) => {
  if (type === 'js') {
    return process.env.IPFS_JS_EXEC || require.resolve('ipfs/src/cli/bin.js')
  }

  if (type === 'go') {
    return process.env.IPFS_GO_EXEC || require.resolve(`go-ipfs-dep/go-ipfs/${isWindows ? 'ipfs.exe' : 'ipfs'}`)
  }
}

const tmpDir = (type = '') => {
  return path.join(os.tmpdir(), `${type}_ipfs_${nanoid()}`)
}

module.exports = {
  removeRepo,
  repoExists,
  defaultRepo,
  checkForRunningApi,
  findBin,
  tmpDir
}
