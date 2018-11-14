'use strict'

const rimraf = require('rimraf')
const fs = require('fs')
const path = require('path')
const os = require('os')
const debug = require('debug')

const log = debug('ipfsd-ctl')

exports.removeRepo = function removeRepo (dir, callback) {
  fs.access(dir, (err) => {
    if (err) {
      // Does not exist so all good
      return callback()
    }

    rimraf(dir, callback)
  })
}

exports.repoExists = function (repoPath, cb) {
  fs.access(`${repoPath}/config`, (err) => {
    if (err) { return cb(null, false) }
    cb(null, true)
  })
}

exports.defaultRepo = function (type) {
  path.join(
    os.homedir(),
    type === 'js' ? '.jsipfs' : '.ipfs'
  )
}

exports.checkForRunningApi = function (path) {
  let api
  try {
    api = fs.readFileSync(`${path}/api`)
  } catch (err) {
    log(`Unable to open api file: ${err}`)
  }

  return api ? api.toString() : null
}
