'use strict'

const createClient = require('./client')

class Factory {
  constructor (options) {
    this._options = options || {}
    this._client = null
  }

  _spawn (repoPath, opts, callback) {
    if (typeof repoPath === 'function') {
      callback = repoPath
      repoPath = null
    }
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }

    opts = Object.assign({}, opts, { repoPath })
    this._client.start(opts, callback)
  }

  spawnNode (repoPath, opts, callback) {
    if (!this._client) {
      return createClient(this._options, (err, cl) => {
        if (err) {
          return callback(err)
        }

        this._client = cl
        return this._spawn(repoPath, opts, callback)
      })
    }

    return this._spawn(repoPath, opts, callback)
  }

  dismantle (callback) {
    if (!this._client) {
      return callback()
    }

    this._client.stop(callback)
  }
}

module.exports = Factory
