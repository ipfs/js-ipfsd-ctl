# ipfsd-ctl, the IPFS Factory

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Travis CI](https://flat.badgen.net/travis/ipfs/js-ipfsd-ctl?branch=master)](https://travis-ci.com/ipfs/js-ipfsd-ctl)
[![Codecov branch](https://img.shields.io/codecov/c/github/ipfs/js-ipfs-multipart/master.svg?style=flat-square)](https://codecov.io/gh/ipfs/js-ipfs-multipart)
[![Dependency Status](https://david-dm.org/ipfs/js-ipfsd-ctl.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfsd-ctl)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![Bundle Size](https://flat.badgen.net/bundlephobia/minzip/ipfsd-ctl)](https://bundlephobia.com/result?p=ipfsd-ctl)
> Spawn IPFS daemons using JavaScript!

## Lead Maintainer

[Hugo Dias](https://github.com/hugomrdias)

## Notice
Version 1.0.0 changed a bit the api and the options methods take so please read the documentation below.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Packaging](#packaging)
- [Contribute](#contribute)
- [License](#license)

## Install

```sh
npm install --save ipfsd-ctl
```

## Usage

**Spawn an IPFS daemon from Node.js**

```js
// Start a disposable node, and get access to the api
// print the node id, and stop the temporary daemon
const Ctl = require('ipfsd-ctl')
const factory = Ctl.createFactory()

const ipfsd = await factory.spawn()
const id = await ipfsd.api.id()

console.log(id)

await ipfsd.stop()
```

**Spawn an IPFS daemon from the Browser using the provided remote endpoint**

```js
// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const Ctl = require('ipfsd-ctl')

const port = 9090
const server = Ctl.createServer(port)
const factory = Ctl.createFactory({ remote: true, endpoint: `http://localhost:${port}` })

await server.start()
const ipfsd = await factory.spawn()
const id = await ipfsd.api.id()

console.log(id)

await ipfsd.stop()
await server.stop()
```

## Disposable vs non Disposable nodes

`ipfsd-ctl` can spawn `disposable` and `non-disposable` nodes.

- `disposable`- Disposable nodes are useful for tests or other temporary use cases, by default they create a temporary repo and automatically initialise and start the node, plus they cleanup everything when stopped.
- `non-disposable` - Non disposable nodes will by default attach to any nodes running on the default or the supplied repo. Requires the user to initialize and start the node, as well as stop and cleanup afterwards.

## API

### `createFactory([options], [overrides])`
Creates a factory that can spawn multiple controllers and pre-define options for them.

- `options` **[ControllerOptions](#ControllerOptions)** Controllers options.
- `overrides` **[ControllerOptionsOverrides](#ControllerOptionsOverrides)** Pre-defined options overrides per controller type.

Returns a **[Factory](#factory)**

### `createController([options])`
Creates a controller.

- `options` **[ControllerOptions](#ControllerOptions)** Factory options.

Returns a **[Controller](#Controller)**

### `createServer([options])`
Create an Endpoint Server. This server is used by a client node to control a remote node. Example: Spawning a go-ipfs node from a browser.

- `options` **[Object]** Factory options. Defaults to: `{ port: 43134 }`
  - `port` **number** Port to start the server on.

Returns a **Server**

### Factory

#### `controllers`
**Controller[]** List of all the controllers spawned.

#### `tmpDir()`
Create a temporary repo to create controllers manually.

Returns **Promise&lt;String>** - Path to the repo.

#### `spawn([options])`
Creates a controller for a IPFS node.
- `options` **[Object]** IPFS options https://github.com/ipfs/js-ipfs#ipfs-constructor

Returns **Promise&lt;[Controller](#controller)>**

#### `clean()`
Cleans all controllers spawned.

Returns **Promise&lt;[Factory](#factory)>**

### Controller
Class controller for a IPFS node.

#### `new Controller(options)`

- `options` **[ControllerOptions](#ControllerOptions)**

#### `path`
**String** Repo path.

#### `exec`
**String** Executable path.

#### `env`
**Object** ENV object.

#### `initalized`
**Boolean** Flag with the current init state.

#### `started`
**Boolean** Flag with the current start state.

#### `clean`
**Boolean** Flag with the current clean state.

#### `apiAddr`
**Multiaddr** API address

#### `gatewayAddr`
**Multiaddr** Gateway address

#### `api`
**Object** IPFS core interface

#### `init([initOptions])`
Initialises controlled node

- `initOptions` **[Object]** IPFS init options https://github.com/ipfs/js-ipfs/blob/master/README.md#optionsinit

Returns **Promise&lt;[Controller](#controller)>**

#### `start()`
Starts controlled node.

Returns **Promise&lt;IPFS>**

#### `stop()`
Stops controlled node.

Returns **Promise&lt;[Controller](#controller)>**

#### `cleanup()`
Cleans controlled node, a disposable controller calls this automatically.

Returns **Promise&lt;[Controller](#controller)>**


#### `pid()`
Get the pid of the controlled node process if aplicable.

Returns **Promise&lt;number>**


#### `version()`
Get the version of the controlled node.

Returns **Promise&lt;string>**


### ControllerOptionsOverrides

Type: [Object]

#### Properties
-   `js` **[[ControllerOptions](#ControllerOptions)]** Pre-defined defaults options for **JS** controllers these are deep merged with options passed to `Factory.spawn(options)`.
-   `go` **[[ControllerOptions](#ControllerOptions)]** Pre-defined defaults options for **Go** controllers these are deep merged with options passed to `Factory.spawn(options)`.
-   `proc` **[[ControllerOptions](#ControllerOptions)]** Pre-defined defaults options for **Proc** controllers these are deep merged with options passed to `Factory.spawn(options)`.


### ControllerOptions

Type: [Object]

#### Properties
-   `test` **[boolean]** Flag to activate custom config for tests.
-   `remote` **[boolean]** Use remote endpoint to spawn the nodes. Defaults to `true` when not in node.
-   `disposable` **[boolean]** A new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits.
-   `type` **[string]** The daemon type, see below the options:
    -   go - spawn go-ipfs daemon
    -   js - spawn js-ipfs daemon
    -   proc - spawn in-process js-ipfs node
-   `env` **[Object]** Additional environment variables, passed to executing shell. Only applies for Daemon controllers.
-   `args` **[Array]** Custom cli args.
-   `ipfsHttpModule` **[Object]** Define the `ipfs-http-client` package to be used by ctl. Both `ref` and `path` should be specified to make sure all node types (daemon, remote daemon, browser in process node, etc) use the correct version.
    -   `ipfsHttpModule.ref` **[Object]** Reference to a IPFS HTTP Client object. (defaults to the local require(`ipfs-http-client`))
    -   `ipfsHttpModule.path` **[string]** Path to a IPFS HTTP Client to be required. (defaults to the local require.resolve('ipfs-http-client'))
-   `ipfsModule` **[Object]** Define the `ipfs` package to be used by ctl. Both `ref` and `path` should be specified to make sure all node types (daemon, remote daemon, browser in process node, etc) use the correct version.
    -   `ipfsModule.ref` **[Object]** Reference to a IPFS API object. (defaults to the local require(`ipfs`))
    -   `ipfsModule.path` **[string]** Path to a IPFS API implementation to be required. (defaults to the local require.resolve('ipfs'))
-   `ipfsBin` **[string]** Path to a IPFS exectutable . (defaults to the local 'js-ipfs/src/bin/cli.js')
-   `ipfsOptions` **[IpfsOptions]** Options for the IPFS instance same as https://github.com/ipfs/js-ipfs#ipfs-constructor. `proc` nodes receive these options as is, daemon nodes translate the options as far as possible to cli arguments.


## ipfsd-ctl environment variables

In additional to the API described in previous sections, `ipfsd-ctl` also supports several environment variables. This are often very useful when running in different environments, such as CI or when doing integration/interop testing.

_Environment variables precedence order is as follows. Top to bottom, top entry has highest precedence:_

- command line options/method arguments
- env variables
- default values

Meaning that, environment variables override defaults in the configuration file but are superseded by options to `df.spawn({...})`

#### IPFS_JS_EXEC and IPFS_GO_EXEC

An alternative way of specifying the executable path for the `js-ipfs` or `go-ipfs` executable, respectively.


## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/js-ipfsd-ctl/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
