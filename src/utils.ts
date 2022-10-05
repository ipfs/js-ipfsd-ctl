import os from 'os'
import path from 'path'
import fs from 'fs'
import { logger } from '@libp2p/logger'
import { nanoid } from 'nanoid'
import tempWrite from 'temp-write'
import type { ControllerOptions, IPFSOptions, ControllerType } from './index.js'

const log = logger('ipfsd-ctl:utils')

export const removeRepo = async (repoPath: string): Promise<void> => {
  try {
    await fs.promises.rm(repoPath, {
      recursive: true
    })
  } catch (err: any) {
    // ignore
  }
}

export const repoExists = async (repoPath: string): Promise<boolean> => {
  return await Promise.resolve(fs.existsSync(path.join(repoPath, 'config')))
}

export const defaultRepo = (type?: ControllerType): string => {
  if (process.env.IPFS_PATH !== undefined) {
    return process.env.IPFS_PATH
  }
  return path.join(
    os.homedir(),
    type === 'js' || type === 'proc' ? '.jsipfs' : '.ipfs'
  )
}

export const checkForRunningApi = (repoPath = ''): string | null => {
  let api
  try {
    api = fs.readFileSync(path.join(repoPath, 'api'))
  } catch (err: any) {
    log('Unable to open api file')
  }

  return (api != null) ? api.toString() : null
}

export const tmpDir = (type = ''): string => {
  return path.join(os.tmpdir(), `${type}_ipfs_${nanoid()}`)
}

export function buildInitArgs (opts: ControllerOptions = {}): string[] {
  const args = ['init']
  const ipfsOptions: IPFSOptions = opts.ipfsOptions ?? {}
  const initOptions = ipfsOptions.init != null && typeof ipfsOptions.init !== 'boolean' ? ipfsOptions.init : {}

  // default-config only for JS
  if (opts.type === 'js') {
    if (ipfsOptions.config != null) {
      args.push(tempWrite.sync(JSON.stringify(ipfsOptions.config)))
    }

    if (initOptions.pass != null) {
      args.push('--pass', `"${initOptions.pass}"`)
    }
  }

  // Translate IPFS options to cli args
  if (initOptions.bits != null) {
    args.push('--bits', `${initOptions.bits}`)
  }

  if (initOptions.algorithm != null) {
    args.push('--algorithm', initOptions.algorithm)
  }

  if (initOptions.emptyRepo === true) {
    args.push('--empty-repo')
  }

  if (Array.isArray(initOptions.profiles) && initOptions.profiles.length > 0) {
    args.push('--profile', initOptions.profiles.join(','))
  }

  return args
}

export function buildStartArgs (opts: ControllerOptions = {}): string[] {
  const ipfsOptions: IPFSOptions = opts.ipfsOptions ?? {}
  const customArgs: string[] = opts.args ?? []

  const args = ['daemon'].concat(customArgs)

  if (opts.type === 'js') {
    if (ipfsOptions.pass != null) {
      args.push('--pass', '"' + ipfsOptions.pass + '"')
    }

    if (ipfsOptions.preload != null) {
      args.push('--enable-preload', Boolean(typeof ipfsOptions.preload === 'boolean' ? ipfsOptions.preload : ipfsOptions.preload.enabled).toString())
    }

    if (ipfsOptions.EXPERIMENTAL?.sharding === true) {
      args.push('--enable-sharding-experiment')
    }
  }

  if (ipfsOptions.offline === true) {
    args.push('--offline')
  }

  if ((ipfsOptions.EXPERIMENTAL != null) && ipfsOptions.EXPERIMENTAL.ipnsPubsub === true) {
    args.push('--enable-namesys-pubsub')
  }

  if (ipfsOptions.repoAutoMigrate === true) {
    args.push('--migrate')
  }

  return args
}
