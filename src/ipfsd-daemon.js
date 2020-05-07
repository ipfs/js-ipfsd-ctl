'use strict'

const multiaddr = require('multiaddr')
const fs = require('fs-extra')
const merge = require('merge-options').bind({ ignoreUndefined: true })
const debug = require('debug')
const execa = require('execa')
const { nanoid } = require('nanoid')
const path = require('path')
const os = require('os')
const tempWrite = require('temp-write')
const { checkForRunningApi, repoExists, tmpDir, defaultRepo } = require('./utils')

const daemonLog = {
  info: debug('ipfsd-ctl:daemon:stdout'),
  err: debug('ipfsd-ctl:daemon:stderr')
}

function translateError (err) {
  // get the actual error message to be the err.message
  err.message = `${err.stdout} \n\n ${err.stderr} \n\n ${err.message} \n\n`

  return err
}

/** @typedef {import("./index").ControllerOptions} ControllerOptions */

/**
 * Controller for daemon nodes
 * @class
 *
 */
class Daemon {
  /**
   * @constructor
   * @param {ControllerOptions} [opts]
   */
  constructor (opts) {
    /** @type ControllerOptions */
    this.opts = opts
    this.path = this.opts.ipfsOptions.repo || (opts.disposable ? tmpDir(opts.type) : defaultRepo(opts.type))
    this.exec = this.opts.ipfsBin
    this.env = merge({ IPFS_PATH: this.path }, this.opts.env)
    this.disposable = this.opts.disposable
    this.subprocess = null
    this.initialized = false
    this.started = false
    this.clean = true
    this.apiAddr = null
    this.gatewayAddr = null
    this.api = null

    this.logs = []
    this.printLogsOnError = false
  }

  /**
   * @private
   * @param {string} addr
   */
  _setApi (addr) {
    this.apiAddr = multiaddr(addr)
    this.api = this.opts.ipfsHttpModule(addr)
    this.api.apiHost = this.apiAddr.nodeAddress().address
    this.api.apiPort = this.apiAddr.nodeAddress().port
  }

  /**
   * @private
   * @param {string} addr
   */
  _setGateway (addr) {
    this.gatewayAddr = multiaddr(addr)
    this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
    this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
  }

  /**
   * Initialize a repo.
   *
   * @param {Object} [initOptions={}] - @see https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsinit
   * @returns {Promise<Daemon>}
   */
  async init (initOptions) {
    this.initialized = await repoExists(this.path)
    if (this.initialized) {
      this.clean = false
      return this
    }

    const opts = merge(
      {
        emptyRepo: false,
        profiles: this.opts.test ? ['test'] : []
      },
      typeof this.opts.ipfsOptions.init === 'boolean' ? {} : this.opts.ipfsOptions.init,
      typeof initOptions === 'boolean' ? {} : initOptions
    )

    const args = ['init']

    // default-config only for JS
    if (this.opts.ipfsOptions.config && this.opts.type === 'js') {
      args.push(tempWrite.sync(JSON.stringify(this.opts.ipfsOptions.config)))
    }

    // Translate ipfs options to cli args
    if (opts.bits) {
      args.push('--bits', opts.bits)
    }
    if (opts.pass && this.opts.type === 'js') {
      args.push('--pass', '"' + opts.pass + '"')
    }
    if (opts.emptyRepo) {
      args.push('--empty-repo')
    }
    if (Array.isArray(opts.profiles) && opts.profiles.length) {
      args.push('--profile', opts.profiles.join(','))
    }

    const { stdout, stderr } = await execa(this.exec, args, {
      env: this.env
    })
      .catch(translateError)

    daemonLog.info(stdout)
    daemonLog.err(stderr)

    // default-config only for Go
    if (this.opts.type === 'go') {
      await this._replaceConfig(merge(
        await this._getConfig(),
        this.opts.ipfsOptions.config
      ))
    }

    this.clean = false
    this.initialized = true

    return this
  }

  /**
   * Delete the repo that was being used. If the node was marked as disposable this will be called automatically when the process is exited.
   *
   * @returns {Promise<Daemon>}
   */
  async cleanup () {
    if (!this.clean) {
      await fs.remove(this.path)
      this.clean = true
    }
    return this
  }

  /**
   * Start the daemon.
   *
   * @return {Promise<Daemon>}
   */
  async start () {
    const args = ['daemon']
    const opts = this.opts.ipfsOptions
    // add custom args
    args.push(...this.opts.args)

    if (opts.pass && this.opts.type === 'js') {
      args.push('--pass', '"' + opts.pass + '"')
    }
    if (opts.offline) {
      args.push('--offline')
    }
    if (opts.preload && this.opts.type === 'js') {
      args.push('--enable-preload', Boolean(opts.preload.enabled))
    }
    if (opts.EXPERIMENTAL && opts.EXPERIMENTAL.sharding) {
      args.push('--enable-sharding-experiment')
    }
    if (opts.EXPERIMENTAL && opts.EXPERIMENTAL.ipnsPubsub) {
      args.push('--enable-namesys-pubsub')
    }

    if (!this.env.DEBUG) {
      this.printLogsOnError = true

      this.env.DEBUG = 'ipfs*'
    }

    // Check if a daemon is already running
    const api = checkForRunningApi(this.path)
    if (api) {
      this._setApi(api)
    } else {
      let output = ''
      const ready = new Promise((resolve, reject) => {
        this.subprocess = execa(this.exec, args, {
          env: this.env
        })
        this.subprocess.stderr.on('data', data => {
          daemonLog.err(data.toString())

          if (this.printLogsOnError) {
            this.logs.push(`[stdout] ${data}`)
          }
        })
        this.subprocess.stdout.on('data', data => {
          daemonLog.info(data.toString())

          if (this.printLogsOnError) {
            this.logs.push(`[stderr] ${data}`)
          }
        })

        const readyHandler = data => {
          output += data.toString()
          const apiMatch = output.trim().match(/API .*listening on:? (.*)/)
          const gwMatch = output.trim().match(/Gateway .*listening on:? (.*)/)

          if (apiMatch && apiMatch.length > 0) {
            this._setApi(apiMatch[1])
          }

          if (gwMatch && gwMatch.length > 0) {
            this._setGateway(gwMatch[1])
          }

          if (output.match(/(?:daemon is running|Daemon is ready)/)) {
            // we're good
            this.started = true
            this.subprocess.stdout.off('data', readyHandler)
            resolve(this.api)
          }
        }
        this.subprocess.stdout.on('data', readyHandler)
        this.subprocess.catch(err => reject(translateError(err)))
      })
      await ready
    }

    this.started = true
    // Add `peerId`
    const id = await this.api.id()
    this.api.peerId = id

    return this
  }

  /**
   * Stop the daemon.
   *
   * @return {Promise<Daemon>}
   */
  async stop () {
    if (!this.started) {
      return this
    }

    let killTimeout
    let killed = false
    if (this.opts.forceKill !== false) {
      killTimeout = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.error(new Error(`Timeout stopping ${this.opts.type} node. Process ${this.subprocess.pid} will be force killed now.`))
        killed = true

        this.subprocess.kill('SIGKILL')
      }, this.opts.forceKillTimeout)
    }

    try {
      await this.api.stop()
    } catch (err) {
      if (this.printLogsOnError) {
        for (const line of this.logs) {
          console.error(line)
        }
      }

      if (!killed) {
        throw err // if was killed then ignore error
      }

      daemonLog.info('Daemon was force killed')
    }

    clearTimeout(killTimeout)
    this.subprocess.stderr.removeAllListeners()
    this.subprocess.stdout.removeAllListeners()
    this.started = false

    if (this.disposable) {
      await this.cleanup()
    }
    return this
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {Promise<Number>}
   */
  pid () {
    if (this.subprocess) {
      return Promise.resolve(this.subprocess.pid)
    }
    throw new Error('Daemon process is not running.')
  }

  /**
   * Call `ipfs config`
   *
   * If no `key` is passed, the whole config is returned as an object.
   *
   * @private
   * @param {string} [key] - A specific config to retrieve.
   * @returns {Promise<Object|String>}
   */
  async _getConfig (key = 'show') {
    const {
      stdout
    } = await execa(
      this.exec,
      ['config', key],
      {
        env: this.env
      })
      .catch(translateError)

    if (key === 'show') {
      return JSON.parse(stdout)
    }

    return stdout.trim()
  }

  /**
   * Replace the current config with the provided one
   *
   * @private
   * @param {object} config
   * @returns {Promise<Daemon>}
   */
  async _replaceConfig (config) {
    const tmpFile = path.join(os.tmpdir(), nanoid())

    await fs.writeFile(tmpFile, JSON.stringify(config))
    await execa(
      this.exec,
      ['config', 'replace', `${tmpFile}`],
      { env: this.env }
    )
      .catch(translateError)
    await fs.unlink(tmpFile)

    return this
  }

  /**
   * Get the version of ipfs
   *
   * @returns {Promise<String>}
   */
  async version () {
    const {
      stdout
    } = await execa(this.exec, ['version'], {
      env: this.env
    })
      .catch(translateError)

    return stdout.trim()
  }
}

module.exports = Daemon
