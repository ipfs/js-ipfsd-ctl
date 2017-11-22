'use strict'

const IpfsdCtl = require('..')
const SocketIO = require('socket.io')
const each = require('async/each')
const waterfall = require('async/waterfall')
const eachSeries = require('async/eachSeries')
const series = require('async/series')
const parsePayload = require('./utils').parsePayload

const nodes = new Map()

function start (opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = null
  }

  let node = null
  waterfall([
    (cb) => IpfsdCtl.disposable(opts, cb),
    (n, cb) => {
      node = n
      series([
        (pCb) => {
          const configValues = {
            Bootstrap: [],
            Discovery: {},
            'API.HTTPHeaders.Access-Control-Allow-Origin': ['*'],
            'API.HTTPHeaders.Access-Control-Allow-Methods': [
              'PUT',
              'POST',
              'GET'
            ]
          }
          eachSeries(Object.keys(configValues), (configKey, cb) => {
            const configVal = JSON.stringify(configValues[configKey])
            node.setConfig(configKey, configVal, cb)
          }, pCb)
        },
        (pCb) => node.startDaemon(['--enable-pubsub-experiment'], cb)
      ], cb)
    },
    (api, cb) => api.id(cb),
    (id, cb) => cb(null, nodes.set(id.id, node))
  ], (err) => {
    callback(err, {
      apiAddr: node.apiAddr.toString()
    })
  })
}

function stop (node, callback) {
  if (typeof node === 'function') {
    callback = node
    node = undefined
  }

  if (node) {
    return nodes.get(node).stopDaemon(callback)
  }

  each(nodes, (node, cb) => node[1].stopDaemon(cb), callback)
}

module.exports = (http) => {
  const io = new SocketIO(http.listener)
  io.on('connection', handle)

  function handle (socket) {
    const response = (action) => (err, data) => {
      if (err) {
        return socket.emit(action, JSON.stringify({ err }))
      }

      socket.emit(action, JSON.stringify({ data }))
    }

    socket.on('start', (data) => start.apply(null, parsePayload(data).concat(response('start'))))
    socket.on('stop', (data) => stop.apply(null, parsePayload(data).concat(response('stop'))))
  }
}
