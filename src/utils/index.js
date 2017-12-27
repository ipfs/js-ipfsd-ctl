'use strict'

const async = require('async')
const fs = require('fs')
const hat = require('hat')
const os = require('os')
const path = require('path')
const exec = require('../exec')
const safeParse = require('safe-json-parse/callback')
const createRepo = require('./create-repo-nodejs')

const join = path.join

const isWindows = os.platform() === 'win32'

exports.createRepo = createRepo

// taken from https://github.com/hughsk/flat
exports.flatten = (target) => {
  let output = {}
  const step = (object, prev) => {
    object = object || {}
    Object.keys(object).forEach(function (key) {
      let value = object[key]
      let isarray = Array.isArray(value)
      let type = Object.prototype.toString.call(value)
      let isbuffer = Buffer.isBuffer(value)
      let isobject = (
        type === '[object Object]' ||
        type === '[object Array]'
      )

      let newKey = prev
        ? prev + '.' + key
        : key

      if (!isarray && !isbuffer && isobject && Object.keys(value).length) {
        return step(value, newKey)
      }

      output[newKey] = value
    })
  }

  step(target)

  return output
}

// Consistent error handling
exports.parseConfig = (path, callback) => {
  async.waterfall([
    (cb) => fs.readFile(join(path, 'config'), cb),
    (file, cb) => safeParse(file.toString(), cb)
  ], callback)
}

exports.tempDir = (isJs) => {
  return join(os.tmpdir(), `${isJs ? 'jsipfs' : 'ipfs'}_${hat()}`)
}

exports.findIpfsExecutable = (type, rootPath) => {
  const execPath = {
    go: path.join('go-ipfs-dep', 'go-ipfs', isWindows ? 'ipfs.exe' : 'ipfs'),
    js: path.join('ipfs', 'src', 'cli', 'bin.js')
  }

  let appRoot = rootPath ? path.join(rootPath, '..') : process.cwd()
  // If inside <appname>.asar try to load from .asar.unpacked
  // this only works if asar was built with
  // asar --unpack-dir=node_modules/go-ipfs-dep/* (not tested)
  // or
  // electron-packager ./ --asar.unpackDir=node_modules/go-ipfs-dep
  if (appRoot.includes(`.asar${path.sep}`)) {
    appRoot = appRoot.replace(`.asar${path.sep}`, `.asar.unpacked${path.sep}`)
  }
  const depPath = execPath[type]
  const npm3Path = path.join(appRoot, '../', depPath)
  const npm2Path = path.join(appRoot, 'node_modules', depPath)

  if (fs.existsSync(npm3Path)) {
    return npm3Path
  }
  if (fs.existsSync(npm2Path)) {
    return npm2Path
  }

  throw new Error('Cannot find the IPFS executable')
}

function setConfigValue (node, key, value, callback) {
  exec(
    node.exec,
    ['config', key, value, '--json'],
    { env: node.env },
    callback
  )
}

exports.setConfigValue = setConfigValue

exports.configureNode = (node, conf, callback) => {
  async.eachOfSeries(conf, (value, key, cb) => {
    setConfigValue(node, key, JSON.stringify(value), cb)
  }, callback)
}
