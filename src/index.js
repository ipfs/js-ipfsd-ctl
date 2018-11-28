'use strict'

const isNode = require('detect-node')
const defaults = require('lodash.defaultsdeep')

const FactoryDaemon = require('./factory-daemon')
const FactoryInProc = require('./factory-in-proc')
const FactoryClient = require('./factory-client')
const Server = require('./endpoint/server')

/**
 * Create a Factory
 *
 * @static
 * @function
 * @param {Object} [opts={}]
 * @param {boolean} [opts.remote] - Use remote endpoint to spawn the nodes. Defaults to `true` when not in node.
 * @param {number} [opts.port=43134] - Remote endpoint port.
 * @param {string} [opts.exec] - IPFS executable path. ipfsd-ctl will attempt to locate it by default.
 * If you desire to spawn js-ipfs instances in the same process, pass the reference to the module instead (e.g exec: `require('ipfs')`)
 * @param {string} [opts.type] - The daemon type, see below the options:
 * - go - spawn go-ipfs daemon
 * - js - spawn js-ipfs daemon
 * - proc - spawn in-process js-ipfs instance. Needs to be called also with exec. Example: `IPFSFactory.create({type: 'proc', exec: require('ipfs') })`.
 * @param {Object} IpfsClient - A custom IPFS API constructor to use instead of the packaged one `js-ipfs-http-client`.
 * @returns {(FactoryDaemon|FactoryClient|FactoryInProc)}
 */
const create = (opts) => {
  const options = defaults({}, opts, { remote: !isNode })

  if (options.type === 'proc') {
    return new FactoryInProc(options)
  } else if (options.remote) {
    return new FactoryClient(options)
  } else {
    return new FactoryDaemon(options)
  }
}

/**
 * Create a Endpoint Server
 *
 * @static
 * @function
 * @param {(Object|number)} options - Configuration options or just the port.
 * @param {number} options.port - Port to start the server on.
 * @returns {Server}
 */
const createServer = (options) => {
  if (typeof options === 'number') {
    options = { port: options }
  }
  return new Server(options)
}

module.exports = {
  create,
  createServer
}

/**
 * @typedef {Object} SpawnOptions
 * @property {Boolean} [init=true] - Should the node be initialized.
 * @property {Object} initOptions - Should be of the form `{bits: <size>}`, which sets the desired key size.
 * @property {Boolean} [start=true] - Should the node be started.
 * @property {string} [repoPath] - The repository path to use for this node, ignored if node is disposable.
 * @property {Boolean} [disposable=true] - A new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits.
 * @property {Boolean} [defaultAddrs=false] - Use the daemon default Swarm addrs.
 * @property {String[]} [args] - Array of cmd line arguments to be passed to the IPFS daemon.
 * @property {Object} [config] - IPFS configuration options. {@link https://github.com/ipfs/js-ipfs#optionsconfig IPFS config}
 * @property {Object} env - Additional environment variables, passed to executing shell. Only applies for Daemon controllers.
 *
 */
