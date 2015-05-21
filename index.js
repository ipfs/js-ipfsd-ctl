var run = require('comandante')
var _ = require('lodash')
var Q = require('kew')
var ipfs = require('ipfs-api')
var waterfall = require('promise-waterfall')

function configureNode (node, conf, cb) {
  waterfall(_.map(conf, function (value, key) {
    return function () {
      var def = Q.defer()
      run('ipfs', ['config', key, value])
        .on('error', function (err) { cb(err) })
        .on('end', function () { def.resolve() })
      return def.promise
    }
  })).then(function () {
    cb(null, true)
  })
}

var ctl = function (path) {
  var env = process.env
  env.IPFS_PATH = path
  return {
    path: path,
    init: function (opts, cb) {
      var t = this
      if (!cb) cb = opts
      var buf = ''
      run('ipfs', ['init'], {env: env})
        .on('error', function (err) { cb(err) })
        .on('data', function (data) { buf += data })
        .on('end', function () {
          configureNode(t, opts, function (err) {
            if (err) return cb(err)
            cb(null, buf)
          })
        })
    },
    getConf: function (key, cb) {
      var result = ''
      run('ipfs', ['config', key])
        .on('error', function (err) { cb(err) })
        .on('data', function (data) { result += data })
        .on('end', function () { cb(null, result.trim()) })
    },
    daemon: function (opts, cb) {
      if (!cb) cb = opts
      var t = this
      var running = run('ipfs', ['daemon'], {env: env})

      running
        .on('error', function (err) { cb(err) })
        .on('data', function (data) {
          if ((data + '').match(/API server listening/)) {
            t.getConf('Addresses.API', function (err, value) {
              if (err) throw err
              var split = value.split('/')
              t.pid = running.pid
              cb(null, ipfs('127.0.0.1', split[split.length - 1]), t.pid)
            })
          }
        })
    },
    stop: function (cb) {
      if (this.pid) {
        run('kill', [this.pid])
          .on('error', function (err) { cb(err) })
          .on('end', function () { cb(null) })
      } else {
        // not started, no problem
        cb(null)
      }
    }
  }
}

module.exports = ctl
