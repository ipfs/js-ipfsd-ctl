'use strict'

const request = require('superagent')
const DaemonClient = require('./daemon-client')

class DaemonFactoryClient {
  constructor (opts) {
    opts = opts || {}
    if (!opts.host) {
      opts.host = 'localhost'
    }

    if (!opts.port) {
      opts.port = 9999
    }

    if (typeof opts.host === 'number') {
      opts.port = opts.host
      opts.host = 'localhost'
    }

    this.port = opts.port
    this.host = opts.host
    this.type = opts.type || 'go'

    if (this.type === 'proc') {
      throw new Error(`'proc' is not allowed in remote mode`)
    }

    this.baseUrl = `${opts.secure ? 'https://' : 'http://'}${this.host}:${this.port}`
  }

  spawn (opts, callback) {
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }

    opts = opts || {}
    request
      .post(`${this.baseUrl}/spawn`)
      .send({ opts, type: this.type })
      .end((err, res) => {
        if (err) {
          return callback(new Error(err.response ? err.response.body.message : err))
        }

        const apiAddr = res.body.api ? res.body.api.apiAddr : ''
        const gatewayAddr = res.body.api ? res.body.api.gatewayAddr : ''

        const ipfsd = new DaemonClient(this.baseUrl, res.body.id, apiAddr, gatewayAddr)

        callback(null, ipfsd)
      })
  }
}

module.exports = DaemonFactoryClient