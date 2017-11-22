'use strict'

const io = require('socket.io-client')
const IpfsApi = require('ipfs-api')

const { toPayload, toRes } = require('./utils')

class Client {
  constructor (sio) {
    this._sio = sio
  }

  _request () {
    const action = Array.from(arguments).shift()
    const args = Array.from(arguments).splice(1, arguments.length - 2)
    const cb = Array.from(arguments).splice(arguments.length - 1, 1).shift()
    this._sio.on(action, (data) => toRes(data, cb))
    this._sio.emit(action, toPayload(args))
  }

  start (opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }

    this._request('start', opts, (err, api) => {
      if (err) {
        return cb(err)
      }

      cb(null, new IpfsApi(api.apiAddr))
    })
  }

  stop (nodes, cb) {
    if (typeof nodes === 'function') {
      cb = nodes
      nodes = undefined
    }

    cb = cb || (() => {})
    this._request('stop', nodes, cb)
  }
}

function createClient (options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  callback = callback || (() => {})
  options = options || {}
  const url = options.url ? (delete options.url) : 'http://localhost:55155'
  options = Object.assign({}, options, {
    transports: ['websocket'],
    'force new connection': true
  })

  const sio = io.connect(url, options)
  sio.once('connect_error', (err) => { throw err })
  sio.once('connect', () => {
    callback(null, new Client(sio))
  })
}

module.exports = createClient
