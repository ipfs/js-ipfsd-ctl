'use strict'

const IPFSRepo = require('ipfs-repo')
const os = require('os')
const path = require('path')
const hat = require('hat')
const series = require('async/series')
const rimraf = require('rimraf')
const fs = require('fs')

const clean = (dir) => {
  try {
    fs.accessSync(dir)
  } catch (err) {
    // Does not exist so all good
    return
  }

  rimraf.sync(dir)
}

function createTempRepo (repoPath) {
  repoPath = repoPath || path.join(os.tmpdir(), '/ipfs-test-' + hat())

  const repo = new IPFSRepo(repoPath)

  repo.teardown = (done) => {
    series([
      // ignore err, might have been closed already
      (cb) => repo.close(() => cb()),
      (cb) => {
        clean(repoPath)
        cb()
      }
    ], done)
  }

  return repo
}

module.exports = createTempRepo
