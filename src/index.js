'use strict'

const merge = require('merge-options')
const Server = require('./endpoint/server')
const Factory = require('./factory')
const testsConfig = require('./config')

/** @typedef {import("./ipfsd-daemon")} Daemon */
/** @typedef {import("./ipfsd-client")} Client */
/** @typedef {import("./ipfsd-in-proc")} InProc */

/**
 * Creates a factory
 *
 * @param {FactoryOptions} options
 * @returns {Factory}
 */
const create = (options) => {
  return new Factory(options)
}

/**
 * Creates a node
 *
 * @param {FactoryOptions} [options]
 * @returns {Promise<Daemon | Client | InProc>}
 */
const createNode = (options) => {
  const f = new Factory(options)
  return f.spawn()
}
/**
 * Create a node for tests
 *
 * @param {FactoryOptions} [opts={}]
 * @returns {Promise<Daemon | Client | InProc>}
 */
const createTestsNode = async (opts = {}) => {
  /** @type FactoryOptions */
  const options = merge({
    ipfsOptions: {
      config: testsConfig(opts),
      init: {
        bits: opts.type === 'js' ? 512 : 1024,
        profiles: ['test']
      },
      preload: { enabled: false }

    }
  }, opts)

  const node = await createNode(options)
  if (node.started) {
    // Add `peerId`
    const id = await node.api.id()
    node.api.peerId = id
  }

  return node
}

/**
 *
 * Create a interface for tests setup
 *
 * @param {FactoryOptions} createOptions
 * @returns {TestsInterface}
 */
const createTestsInterface = (createOptions = {}) => {
  // Managed nodes
  const nodes = []

  const spawn = (options = {}) => {
    // Create factory with merged options
    return createTestsNode(merge(
      createOptions,
      options
    ))
  }

  return {
    nodes,
    node: spawn,
    setup: async (options) => {
      const node = await spawn(options)
      nodes.push(node)
      return node.api
    },
    teardown: () => Promise.all(nodes.map(n => n.stop()))
  }
}

/**
 * Create a Endpoint Server
 *
 * @param {(Object|number)} options - Configuration options or just the port.
 * @param {number} options.port - Port to start the server on.
 * @returns {Server}
 */
const createServer = (options) => {
  if (typeof options === 'number') {
    options = { port: options }
  }
  return new Server(options, create)
}

module.exports = {
  create,
  createNode,
  createTestsNode,
  createTestsInterface,
  createServer
}

/**
 * @callback TestsInterfaceNode
 * @param {FactoryOptions} options
 * @return {Promise<Daemon>} Returns a IPFSd-ctl Daemon
 */

/**
 * @callback TestsInterfaceSetup
 * @param {FactoryOptions} options
 * @return {Promise<IpfsClient>} Returns an IPFS core API
 */

/**
 * @callback TestsInterfaceTeardown
 * @return {Promise<void>}
 */

/**
 * @typedef {object} TestsInterface - Creates and pre-configured interface to use in tests
 * @property {TestsInterfaceNode} node - Create a single unmanaged IPFSd-ctl Daemon
 * @property {TestsInterfaceSetup} setup - Setup a managed node and returns an IPFS Core API
 * @property {TestsInterfaceTeardown} teardown - Stop all managed nodes
 * @property {Array<Daemon | Client | InProc>} nodes - List of the managed nodes
 */

/**
 * Same as https://github.com/ipfs/js-ipfs/blob/master/README.md#ipfs-constructor
 * @typedef {Object} IpfsOptions
 * @property {string|Object} [repo] - The file path at which to store the IPFS node’s data. Alternatively, you can set up a customized storage system by providing an ipfs.Repo instance.
 * @property {boolean|Object} [init=true] - Initialize the repo when creating the IPFS node. Instead of a boolean, you may provide an object with custom initialization options. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsinit
 * @property {boolean} [start=true] - If false, do not automatically start the IPFS node. Instead, you’ll need to manually call node.start() yourself.
 * @property {string} [pass=null] - A passphrase to encrypt/decrypt your keys.
 * @property {boolean} [silent=false] - Prevents all logging output from the IPFS node.
 * @property {object} [relay] - Configure circuit relay. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsrelay Default: `{ enabled: true, hop: { enabled: false, active: false } }`
 * @property {object} [preload] - Configure remote preload nodes. The remote will preload content added on this node, and also attempt to preload objects requested by this node. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionspreload Default: `{ enabled: true, addresses: [...]`
 * @property {object} [EXPERIMENTAL] - Enable and configure experimental features. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsexperimental Default: `{ ipnsPubsub: false, sharding: false }`
 * @property  {object} [config] - Modify the default IPFS node config. This object will be merged with the default config; it will not replace it. The default config is documented in the js-ipfs config file docs. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsconfig
 * @property {object} [ipld] - Modify the default IPLD config. This object will be merged with the default config; it will not replace it. Check IPLD docs for more information on the available options. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsipld
 * @property {object|function} [libp2p] - The libp2p option allows you to build your libp2p node by configuration, or via a bundle function. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionslibp2p
 * @property {object} [connectionManager] - Configure the libp2p connection manager. https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsconnectionmanager
 * @property {boolean} [offline=false] - Run the node offline.
 */

/**
 * @typedef {Object} FactoryOptions
 * @property {boolean} [remote] - Use remote endpoint to spawn the nodes. Defaults to `true` when not in node.
 * @property {string} [host=localhost] - Remote endpoint host. (Defaults to localhost)
 * @property {number} [port=43134] - Remote endpoint port. (Defaults to 43134)
 * @property {string} [secure=false] - Remote endpoint uses http or https. (Defaults to false)
 * @property {Boolean} [disposable=true] - A new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits.
 * @property {string} [type] - The daemon type, see below the options:
 * - go - spawn go-ipfs daemon
 * - js - spawn js-ipfs daemon
 * - proc - spawn in-process js-ipfs instance
 * @property {Object} [env] - Additional environment variables, passed to executing shell. Only applies for Daemon controllers.
 * @property {Array} [args] - Custom cli args.
 * @property {Object} [ipfsHttp] - Setup IPFS HTTP client to be used by ctl.
 * @property {Object} [ipfsHttp.ref] - Reference to a IPFS HTTP Client object. (defaults to the local require(`ipfs-http-client`))
 * @property {string} [ipfsHttp.path] - Path to a IPFS HTTP Client to be required. (defaults to the local require.resolve('ipfs-http-client'))
 * @property {Object} [ipfsApi] - Setup IPFS API to be used by ctl.
 * @property {Object} [ipfsApi.ref] - Reference to a IPFS API object. (defaults to the local require(`ipfs`))
 * @property {string} [ipfsApi.path] - Path to a IPFS API implementation to be required. (defaults to the local require.resolve('ipfs'))
 * @property {String} [ipfsBin] - Path to a IPFS exectutable . (defaults to the local 'js-ipfs/src/bin/cli.js')
 * @property {IpfsOptions} [ipfsOptions] - Options for the IPFS instance
 */
