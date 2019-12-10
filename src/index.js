'use strict'

const Server = require('./endpoint/server')
const Factory = require('./factory')

/** @typedef {import("./ipfsd-daemon")} Controller */

/**
 * Creates a factory
 *
 * @param {ControllerOptions} options
 * @param {ControllerOptionsOverrides} overrides
 * @returns {Factory}
 */
const createFactory = (options, overrides) => {
  return new Factory(options, overrides)
}

/**
 * Creates a node
 *
 * @param {ControllerOptions} [options]
 * @returns {Promise<Controller>}
 */
const createController = (options) => {
  const f = new Factory()
  return f.spawn(options)
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
  return new Server(options, createFactory)
}

module.exports = {
  createFactory,
  createController,
  createServer
}

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
 * @typedef {Object} ControllerOptions
 * @property {boolean} [test=false] - Flag to activate custom config for tests.
 * @property {boolean} [remote] - Use remote endpoint to spawn the controllers. Defaults to `true` when not in node.
 * @property {string} [endpoint] - Endpoint URL to manage remote Controllers. (Defaults: 'http://localhost:43134').
 * @property {Boolean} [disposable=true] - A new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits.
 * @property {string} [type] - The daemon type, see below the options:
 * - go - spawn go-ipfs daemon node
 * - js - spawn js-ipfs daemon node
 * - proc - spawn in-process js-ipfs node
 * @property {Object} [env] - Additional environment variables, passed to executing shell. Only applies for Daemon controllers.
 * @property {Array} [args] - Custom cli args.
 * @property {Object} [ipfsHttpModule] - Setup IPFS HTTP client to be used by ctl.
 * @property {Object} [ipfsHttpModule.ref] - Reference to a IPFS HTTP Client object. (defaults to the local require(`ipfs-http-client`))
 * @property {string} [ipfsHttpModule.path] - Path to a IPFS HTTP Client to be required. (defaults to the local require.resolve('ipfs-http-client'))
 * @property {Object} [ipfsModule] - Setup IPFS API to be used by ctl.
 * @property {Object} [ipfsModule.ref] - Reference to a IPFS API object. (defaults to the local require(`ipfs`))
 * @property {string} [ipfsModule.path] - Path to a IPFS API implementation to be required. (defaults to the local require.resolve('ipfs'))
 * @property {String} [ipfsBin] - Path to a IPFS exectutable . (defaults to the local 'js-ipfs/src/bin/cli.js')
 * @property {IpfsOptions} [ipfsOptions] - Options for the IPFS node.
 */

/**
 * @typedef {Object} ControllerOptionsOverrides
 * @property {ControllerOptions} [js] - Pre-defined defaults options for **JS** controllers these are deep merged with options passed to `Factory.spawn(options)`.
 * @property {ControllerOptions} [go] - Pre-defined defaults options for **Go** controllers these are deep merged with options passed to `Factory.spawn(options)`.
 * @property {ControllerOptions} [proc] - Pre-defined defaults options for **Proc** controllers these are deep merged with options passed to `Factory.spawn(options)`.
 */
