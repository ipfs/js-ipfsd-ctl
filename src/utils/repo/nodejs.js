'use strict'

const os = require('os')
const path = require('path')
const hat = require('hat')
const rimraf = require('rimraf')
const fs = require('fs')

exports.removeRepo = function removeRepo (dir, callback) {
  fs.access(dir, (err) => {
    if (err) {
      // Does not exist so all good
      return callback()
    }

    rimraf(dir, callback)
  })
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
