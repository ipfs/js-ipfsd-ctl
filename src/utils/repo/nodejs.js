'use strict'

const os = require('os')
const path = require('path')
const hat = require('hat')
const rimraf = require('rimraf')
const fs = require('fs')

exports.removeRepo = function removeRepo (dir) {
  try {
    fs.accessSync(dir)
  } catch (err) {
    // Does not exist so all good
    return
  }

  return rimraf.sync(dir)
}

exports.createTempRepoPath = function createTempRepo () {
  return path.join(os.tmpdir(), '/ipfs-test-' + hat())
}

exports.repoExists = function (repoPath, cb) {
  fs.access(`${repoPath}/config`, (err) => {
    if (err) { return cb(null, false) }
    cb(null, true)
  })
}
