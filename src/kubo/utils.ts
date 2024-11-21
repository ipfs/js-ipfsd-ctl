import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { logger } from '@libp2p/logger'
import { nanoid } from 'nanoid'
import type { KuboInitOptions, KuboStartOptions } from '../index.js'

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
  return Promise.resolve(fs.existsSync(path.join(repoPath, 'config')))
}

export const checkForRunningApi = (repoPath = ''): string | undefined => {
  let api
  try {
    api = fs.readFileSync(path.join(repoPath, 'api'))
  } catch (err: any) {
    log('Unable to open api file')
  }

  return (api != null) ? api.toString() : undefined
}

export const getGatewayAddress = (repoPath = ''): string => {
  let gatewayAddress = ''
  try {
    /**
     * Note that this file is only created by Kubo versions >=v0.15.0, which came out in 2022
     *
     * @see https://github.com/ipfs/kubo/blob/720663d7c8f9971d34f85bd4c02a256da2d56a25/docs/changelogs/v0.15.md?plain=1#L56
     */
    gatewayAddress = fs.readFileSync(path.join(repoPath, 'gateway'))?.toString()
  } catch (err: any) {
    log('Unable to open gateway file')
  }
  return gatewayAddress
}

export const tmpDir = (type = ''): string => {
  return path.join(os.tmpdir(), `${type}_ipfs_${nanoid()}`)
}

export function buildInitArgs (options: KuboInitOptions): string[] {
  const args: string[] = ['init'].concat(options.args ?? [])

  // Translate IPFS options to cli args
  if (options.algorithm === 'rsa' && options.bits != null) {
    args.push('--bits', `${options.bits}`)
  }

  if (options.algorithm != null) {
    args.push('--algorithm', options.algorithm)
  }

  if (options.emptyRepo === true) {
    args.push('--empty-repo')
  }

  if (Array.isArray(options.profiles) && options.profiles.length > 0) {
    args.push('--profile', options.profiles.join(','))
  }

  return args
}

export function buildStartArgs (options: KuboStartOptions): string[] {
  const args = ['daemon'].concat(options.args ?? [])

  if (options.offline === true) {
    args.push('--offline')
  }

  if (options.pubsub === true) {
    args.push('--enable-pubsub-experiment')
  }

  if (options.ipnsPubsub === true) {
    args.push('--enable-namesys-pubsub')
  }

  if (options.repoAutoMigrate === true) {
    args.push('--migrate')
  }

  return args
}
