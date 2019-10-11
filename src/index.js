'use strict'

const { isNode } = require('ipfs-utils/src/env')
const merge = require('merge-options')

const FactoryDaemon = require('./factory-daemon')
const FactoryInProc = require('./factory-in-proc')
const FactoryClient = require('./factory-client')
const Server = require('./endpoint/server')

/**
 * Create a Factory
 *
 * @static
 * @function
 * @param {FactoryOptions} [opts={}]
 * @returns {(FactoryDaemon|FactoryInProc|FactoryClient)}
 */
const create = (opts) => {
  const options = merge({ remote: !isNode }, opts)

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

/**
 *
 * Create a interface for tests setup
 *
 * @param {TestsInterfaceOptions} createOptions
 * @returns {TestsInterface}
 */
const createTestsInterface = (createOptions = {}) => {
  // Managed nodes
  const nodes = []

  const createNode = async (options = {}) => {
    // Create factory with merged options
    const ipfsFactory = create(merge(
      options.factoryOptions,
      createOptions.factoryOptions
    ))

    // Spawn with merged options
    const node = await ipfsFactory.spawn(merge(
      {
        initOptions: { profile: 'test' },
        preload: { enabled: false }
      },
      options.spawnOptions,
      createOptions.spawnOptions
    ))

    // Add `peerId`
    const id = await node.api.id()
    node.api.peerId = id

    return node
  }

  return {
    node: createNode,
    setup: async (options) => {
      const node = await createNode(options)
      nodes.push(node)
      return node.api
    },
    teardown: () => {
      return Promise.all(nodes.map(n => n.stop()))
    }
  }
}

module.exports = {
  create,
  createServer,
  createTestsInterface
}

/** @ignore @typedef {import("./ipfsd-daemon")} Daemon */

/**
 * @callback TestsInterfaceCreateNode
 * @param {TestsInterfaceOptions} options
 * @return {Promise<Daemon>} Returns a IPFSd-ctl Daemon
 */

/**
 * @callback TestsInterfaceSetup
 * @param {TestsInterfaceOptions} options
 * @return {Promise<IpfsClient>} Returns an IPFS core API
 */

/**
 * @callback TestsInterfaceTeardown
 * @return {Promise<void>}
 */

/**
 * @typedef {object} TestsInterface - Creates and pre-configured interface to use in tests
 * @property {TestsInterfaceCreateNode} node - Create a single unmanaged IPFSd-ctl Daemon
 * @property {TestsInterfaceSetup} setup - Setup a managed node and returns an IPFS Core API
 * @property {TestsInterfaceTeardown} teardown - Stop all managed nodes
 */

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

/**
 * @typedef {Object} FactoryOptions
 * @property {boolean} [remote] - Use remote endpoint to spawn the nodes. Defaults to `true` when not in node.
 * @property {number} [port=43134] - Remote endpoint port. (Defaults to 43134)
 * @property {string} [exec] - IPFS executable path. ipfsd-ctl will attempt to locate it by default.
 * If you desire to spawn js-ipfs instances in the same process, pass the reference to the module instead (e.g exec: `require('ipfs')`)
 * @property {string} [type] - The daemon type, see below the options:
 * - go - spawn go-ipfs daemon
 * - js - spawn js-ipfs daemon
 * - proc - spawn in-process js-ipfs instance. Needs to be called also with exec. Example: `IPFSFactory.create({type: 'proc', exec: require('ipfs') })`.
 * @property {Object} [IpfsClient] - A custom IPFS API constructor to use instead of the packaged one `js-ipfs-http-client`.
 */

/**
 * @typedef {Object} TestsInterfaceOptions
 * @property {FactoryOptions} [factoryOptions] - FactoryOptions
 * @property {SpawnOptions} [spawnOptions] - SpawnOptions
 */
