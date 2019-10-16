'use strict'

const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const debug = require('debug')
const log = debug('ipfsd-ctl')

const removeRepo = async (dir) => {
  try {
    await fs.remove(dir)
  } catch (err) {
    // ignore
  }
}

const repoExists = async (repoPath) => {
  const exists = await fs.pathExists(`${repoPath}/config`)
  return exists
}

const defaultRepo = (type) => {
  path.join(
    os.homedir(),
    type === 'js' ? '.jsipfs' : '.ipfs'
  )
}

const checkForRunningApi = (path) => {
  let api
  try {
    api = fs.readFileSync(`${path}/api`)
  } catch (err) {
    log(`Unable to open api file: ${err}`)
  }

  return api ? api.toString() : null
}

module.exports = {
  removeRepo,
  repoExists,
  defaultRepo,
  checkForRunningApi
}
