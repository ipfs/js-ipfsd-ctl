'use strict'

const { Multiaddr } = require('multiaddr')
const fs = require('fs-extra')
const merge = require('merge-options').bind({ ignoreUndefined: true })
const debug = require('debug')
const execa = require('execa')
const { nanoid } = require('nanoid')
const path = require('path')
const os = require('os')
const { checkForRunningApi, repoExists, tmpDir, defaultRepo, buildInitArgs, buildStartArgs } = require('./utils')
const waitFor = require('p-wait-for')

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
 *
 * @class
 *
 */
class Daemon {
  /**
   * @class
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
    this.grpcAddr = null
    this.gatewayAddr = null
    this.api = null
  }

  /**
   * @private
   * @param {string} addr
   */
  _setApi (addr) {
    this.apiAddr = new Multiaddr(addr)
  }

  /**
   * @private
   * @param {string} addr
   */
  _setGrpc (addr) {
    this.grpcAddr = new Multiaddr(addr)
  }

  /**
   * @private
   * @param {string} addr
   */
  _setGateway (addr) {
    this.gatewayAddr = new Multiaddr(addr)
  }

  _createApi () {
    if (this.opts.ipfsClientModule && this.grpcAddr) {
      this.api = this.opts.ipfsClientModule.create({
        grpc: this.grpcAddr,
        http: this.apiAddr
      })
    } else if (this.apiAddr) {
      this.api = this.opts.ipfsHttpModule.create(this.apiAddr)
    }

    if (!this.api) {
      throw new Error(`Could not create API from http '${this.apiAddr}' and/or gRPC '${this.grpcAddr}'`)
    }

    if (this.apiAddr) {
      this.api.apiHost = this.apiAddr.nodeAddress().address
      this.api.apiPort = this.apiAddr.nodeAddress().port
    }

    if (this.gatewayAddr) {
      this.api.gatewayHost = this.gatewayAddr.nodeAddress().address
      this.api.gatewayPort = this.gatewayAddr.nodeAddress().port
    }

    if (this.grpcAddr) {
      this.api.grpcHost = this.grpcAddr.nodeAddress().address
      this.api.grpcPort = this.grpcAddr.nodeAddress().port
    }
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

    initOptions = merge({
      emptyRepo: false,
      profiles: this.opts.test ? ['test'] : []
    },
    typeof this.opts.ipfsOptions.init === 'boolean' ? {} : this.opts.ipfsOptions.init,
    typeof initOptions === 'boolean' ? {} : initOptions
    )

    const opts = merge(
      this.opts, {
        ipfsOptions: {
          init: initOptions
        }
      }
    )

    const args = buildInitArgs(opts)

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
   * @returns {Promise<Daemon>}
   */
  async start () {
    // Check if a daemon is already running
    const api = checkForRunningApi(this.path)

    if (api) {
      this._setApi(api)
      this._createApi()
    } else if (!this.exec) {
      throw new Error('No executable specified')
    } else {
      const args = buildStartArgs(this.opts)

      let output = ''

      const ready = new Promise((resolve, reject) => {
        this.subprocess = execa(this.exec, args, {
          env: this.env
        })
        this.subprocess.stderr.on('data', data => daemonLog.err(data.toString()))
        this.subprocess.stdout.on('data', data => daemonLog.info(data.toString()))

        const readyHandler = data => {
          output += data.toString()
          const apiMatch = output.trim().match(/API .*listening on:? (.*)/)
          const gwMatch = output.trim().match(/Gateway .*listening on:? (.*)/)
          const grpcMatch = output.trim().match(/gRPC .*listening on:? (.*)/)

          if (apiMatch && apiMatch.length > 0) {
            this._setApi(apiMatch[1])
          }

          if (gwMatch && gwMatch.length > 0) {
            this._setGateway(gwMatch[1])
          }

          if (grpcMatch && grpcMatch.length > 0) {
            this._setGrpc(grpcMatch[1])
          }

          if (output.match(/(?:daemon is running|Daemon is ready)/)) {
            // we're good
            this._createApi()
            this.started = true
            this.subprocess.stdout.off('data', readyHandler)
            resolve(this.api)
          }
        }
        this.subprocess.stdout.on('data', readyHandler)
        this.subprocess.catch(err => reject(translateError(err)))
        this.subprocess.on('exit', () => {
          this.started = false
          this.subprocess.stderr.removeAllListeners()
          this.subprocess.stdout.removeAllListeners()

          if (this.disposable) {
            this.cleanup().catch(() => {})
          }
        })
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
   * @param {object} [options]
   * @param {number} [options.timeout=60000] - How long to wait for the daemon to stop
   * @returns {Promise<Daemon>}
   */
  async stop (options = {}) {
    const timeout = options.timeout || 60000

    if (!this.started) {
      return this
    }

    if (this.subprocess) {
      let killTimeout

      if (this.disposable) {
        // we're done with this node and will remove it's repo when we are done
        // so don't wait for graceful exit, just terminate the process
        this.subprocess.kill('SIGKILL')
      } else {
        if (this.opts.forceKill !== false) {
          killTimeout = setTimeout(() => {
            // eslint-disable-next-line no-console
            console.error(new Error(`Timeout stopping ${this.opts.type} node after ${this.opts.forceKillTimeout}ms. Process ${this.subprocess.pid} will be force killed now.`))
            this.subprocess.kill('SIGKILL')
          }, this.opts.forceKillTimeout)
        }

        this.subprocess.cancel()
      }

      // wait for the subprocess to exit and declare ourselves stopped
      await waitFor(() => !this.started, {
        timeout
      })

      clearTimeout(killTimeout)

      if (this.disposable) {
        // wait for the cleanup routine to run after the subprocess has exited
        await waitFor(() => this.clean, {
          timeout
        })
      }
    } else {
      await this.api.stop()

      this.started = false
    }

    return this
  }

  /**
   * Get the pid of the `ipfs daemon` process.
   *
   * @returns {Promise<number>}
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
   * @returns {Promise<Object | string>}
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
   * @returns {Promise<string>}
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
