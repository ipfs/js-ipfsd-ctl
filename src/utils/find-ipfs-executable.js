'use strict'

const fs = require('fs')
const os = require('os')
const isWindows = os.platform() === 'win32'
const path = require('path')
const which = require('which')

module.exports = (type, rootPath) => {
  const execPath = {
    go: path.join('go-ipfs-dep', 'go-ipfs', isWindows ? 'ipfs.exe' : 'ipfs'),
    js: path.join('ipfs', 'src', 'cli', 'bin.js')
  }

  const execName = {
    go: `ipfs${isWindows ? '.exe' : ''}`,
    js: `jsipfs${isWindows ? '.cmd' : ''}`
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

  const result = module.exports.find(appRoot, execPath[type], execName[type])

  if (result) {
    return result
  }

  throw new Error('Cannot find the IPFS executable')
}

module.exports.find = (appRoot, depPath, execName) => {
  const npm3Path = path.join(appRoot, '../', depPath)
  const npm2Path = path.join(appRoot, 'node_modules', depPath)

  if (fs.existsSync(npm3Path)) {
    return npm3Path
  }

  if (fs.existsSync(npm2Path)) {
    return npm2Path
  }

  try {
    return require.resolve(depPath)
  } catch (error) {
    // ignore the error
  }

  try {
    return which.sync(execName)
  } catch (error) {
    // ignore the error
  }
}
