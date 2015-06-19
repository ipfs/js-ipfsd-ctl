var run = require('comandante')
var _ = require('lodash')
var Q = require('kew')
var ipfs = require('ipfs-api')
var waterfall = require('promise-waterfall')
var shutdown = require('shutdown-handler')
var rimraf = require('rimraf')
var fs = require('fs')

var IPFS_EXEC = __dirname + '/node_modules/.bin/ipfs'
var GRACE_PERIOD = 7500 // amount of ms to wait before sigkill

function configureNode (node, conf, cb) {
  waterfall(_.map(conf, function (value, key) {
    return function () {
      var def = Q.defer()
      run(IPFS_EXEC, ['config', key, '--json', JSON.stringify(value)],
          {env: node.env})
        .on('error', cb)
        .on('end', function () { def.resolve() })
      return def.promise
    }
  })).then(function () {
    cb(null, true)
  })
}

function tempDir () {
  return '/tmp/ipfs_' + (Math.random() + '').substr(2)
}

var Node = function (path, opts, disposable) {
  var env = _.clone(process.env)
  env.IPFS_PATH = path
  return {
    subprocess: null,
    initialized: fs.existsSync(path),
    clean: true,
    path: path,
    opts: opts,
    env: env,
    init: function (initOpts, cb) {
      var t = this
      if (!cb) cb = initOpts
      var buf = ''
      run(IPFS_EXEC, ['init'], {env: t.env})
        .on('error', cb)
        .on('data', function (data) { buf += data })
        .on('end', function () {
          configureNode(t, t.opts, function (err) {
            if (err) return cb(err)
            t.clean = false
            cb(null, t)
          })
        })
      if (disposable) {
        shutdown.on('exit', t.shutdown.bind(t))
      }
    },
    // cleanup tmp files
    shutdown: function (e) {
      var t = this
      if (!t.clean && disposable) {
        e.preventDefault()
        rimraf(t.path, function (err) {
          if (err) throw err
          process.exit(0)
        })
      }
    },
    startDaemon: function (cb) {
      var t = this
      parseConfig(t.path, function (err, conf) {
        if (err) return cb(err)

        t.subprocess = run(IPFS_EXEC, ['daemon'], {env: t.env})
          .on('error', function (err) {
            if ((err + '').match('daemon is running')) {
              // we're good
              cb(null, ipfs(conf.Addresses.API))
            } else if ((err + '').match('non-zero exit code')) {
              // ignore when kill -9'd
            } else {
              cb(err)
            }
          })
          .on('data', function (data) {
            var match = (data + '').trim().match(/API server listening on (.*)/)
            if (match) {
              t.apiAddr = match[1]
              cb(null, ipfs(t.apiAddr))
            }
          })
      })
    },
    stopDaemon: function (cb) {
      var sp = this.subprocess
      if (!sp) return

      sp.kill('SIGTERM')

      var timeout = setTimeout(function () {
        sp.kill('SIGKILL')
        cb && cb(null)
      }, GRACE_PERIOD)

      sp.on('close', function () {
        clearTimeout(timeout)
        cb && cb(null)
      })

      this.subprocess = null
    },
    daemonPid: function () {
      return this.subprocess && this.subprocess.pid
    },
    getConf: function (key, cb) {
      var t = this
      var result = ''
      run(IPFS_EXEC, ['config', key], {env: t.env})
        .on('error', cb)
        .on('data', function (data) { result += data })
        .on('end', function () { cb(null, result.trim()) })
    }
  }
}

// cb for consistent error handling
var parseConfig = function (path, cb) {
  try {
    var file = fs.readFileSync(path + '/config')
    var parsed = JSON.parse(file)
    cb(null, parsed)
  } catch (e) {
    cb(e)
  }
}

module.exports = {
  version: function (cb) {
    var buf = ''
    run(IPFS_EXEC, ['version'])
      .on('error', cb)
      .on('data', function (data) { buf += data })
      .on('end', function () { cb(null, buf) })
  },
  local: function (cb) {
    // todo, look for other standard paths
    var path = process.env.IPFS_PATH ||
      (process.env.HOME ||
       process.env.USERPROFILE) + '/.ipfs'
    cb(null, new Node(path, {}))
  },
  disposableApi: function (opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
    this.disposable(opts, function (err, node) {
      if (err) return cb(err)
      node.startDaemon(function (err, api) {
        if (err) return cb(err)
        cb(null, api)
      })
    })
  },
  disposable: function (opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
    opts['Addresses.Swarm'] = ['/ip4/0.0.0.0/tcp/0']
    opts['Addresses.Gateway'] = ''
    opts['Addresses.API'] = '/ip4/127.0.0.1/tcp/0'
    var node = new Node(tempDir(), opts, true)
    node.init(function (err) {
      if (err) return cb(err)
      cb(null, node)
    })
  }
}
