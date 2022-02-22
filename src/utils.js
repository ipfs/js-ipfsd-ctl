'use strict'

const os = require('os')
const path = require('path')
const fs = require('fs')
const debug = require('debug')
const { nanoid } = require('nanoid')
const tempWrite = require('temp-write')

const log = debug('ipfsd-ctl:utils')

/**
 * @param {string} repoPath
 */
const removeRepo = async (repoPath) => {
  try {
    await fs.promises.rm(repoPath, {
      recursive: true
    })
  } catch (/** @type {any} */ err) {
    // ignore
  }
}

/**
 * @param {string} repoPath
 */
const repoExists = (repoPath) => {
  return Promise.resolve(fs.existsSync(path.join(repoPath, 'config')))
}

/**
 * @param {import('./types').NodeType} [type]
 */
const defaultRepo = (type) => {
  if (process.env.IPFS_PATH !== undefined) {
    return process.env.IPFS_PATH
  }
  return path.join(
    os.homedir(),
    type === 'js' || type === 'proc' ? '.jsipfs' : '.ipfs'
  )
}

/**
 * @param {string} [repoPath]
 * @returns
 */
const checkForRunningApi = (repoPath = '') => {
  let api
  try {
    api = fs.readFileSync(path.join(repoPath, 'api'))
  } catch (/** @type {any} */ err) {
    log('Unable to open api file')
  }

  return api ? api.toString() : null
}

const tmpDir = (type = '') => {
  return path.join(os.tmpdir(), `${type}_ipfs_${nanoid()}`)
}

/**
 * @param {import('./types').ControllerOptions} opts
 */
function buildInitArgs (opts = {}) {
  const args = ['init']
  const ipfsOptions = opts.ipfsOptions || {}
  const initOptions = ipfsOptions.init && typeof ipfsOptions.init !== 'boolean' ? ipfsOptions.init : {}

  // default-config only for JS
  if (opts.type === 'js') {
    if (ipfsOptions.config) {
      args.push(tempWrite.sync(JSON.stringify(ipfsOptions.config)))
    }

    if (initOptions.pass) {
      args.push('--pass', '"' + initOptions.pass + '"')
    }
  }

  // Translate IPFS options to cli args
  if (initOptions.bits) {
    args.push('--bits', `${initOptions.bits}`)
  }

  if (initOptions.algorithm) {
    args.push('--algorithm', initOptions.algorithm)
  }

  if (initOptions.emptyRepo) {
    args.push('--empty-repo')
  }

  if (Array.isArray(initOptions.profiles) && initOptions.profiles.length) {
    args.push('--profile', initOptions.profiles.join(','))
  }

  return args
}

/**
 * @param {import('./types').ControllerOptions} opts
 */
function buildStartArgs (opts = {}) {
  const ipfsOptions = opts.ipfsOptions || {}
  const customArgs = opts.args || []

  const args = ['daemon'].concat(customArgs)

  if (opts.type === 'js') {
    if (ipfsOptions.pass) {
      args.push('--pass', '"' + ipfsOptions.pass + '"')
    }

    if (ipfsOptions.preload != null) {
      args.push('--enable-preload', Boolean(typeof ipfsOptions.preload === 'boolean' ? ipfsOptions.preload : ipfsOptions.preload.enabled).toString())
    }

    if (ipfsOptions.EXPERIMENTAL && ipfsOptions.EXPERIMENTAL.sharding) {
      args.push('--enable-sharding-experiment')
    }
  }

  if (ipfsOptions.offline) {
    args.push('--offline')
  }

  if (ipfsOptions.EXPERIMENTAL && ipfsOptions.EXPERIMENTAL.ipnsPubsub) {
    args.push('--enable-namesys-pubsub')
  }

  if (ipfsOptions.repoAutoMigrate) {
    args.push('--migrate')
  }

  return args
}

module.exports = {
  removeRepo,
  repoExists,
  defaultRepo,
  checkForRunningApi,
  tmpDir,
  buildInitArgs,
  buildStartArgs
}
