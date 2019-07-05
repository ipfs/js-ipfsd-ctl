'use strict'

const os = require('os')
const path = require('path')
const hat = require('hat')
const fs = require('fs-extra')

function removeRepo (dir) {
  try {
    return fs.remove(dir)
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Does not exist so all good
      return
    }

    throw err
  }
}

function createTempRepoPath () {
  return path.join(os.tmpdir(), '/ipfs-test-' + hat())
}

async function repoExists (repoPath) {
  try {
    await fs.access(`${repoPath}/config`)

    return true
  } catch (err) {
    return false
  }
}

module.exports = {
  createTempRepoPath,
  removeRepo,
  repoExists
}
