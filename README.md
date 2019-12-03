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
This module is moving to async/await starting from **0.44.0**.   
The last minor version to support callbacks is 0.43.0, any backports will merged to the branch `callbacks` and released under  `>0.43.0 <0.44.0`.

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

const { create } = require('ipfsd-ctl')
const factory = create()

const ipfsd = await factory.spawn()
const id = await ipfsd.api.id()

console.log(id)

await ipfsd.stop()
```

**Spawn an IPFS daemon from the Browser using the provided remote endpoint**

```js
// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const { create, createServer } = require('ipfsd-ctl')

const port = 9090
const server = createServer(port)
const f = create({ remote: true, port: port })

await server.start()
const ipfsd = await f.spawn()
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

### `create([options])`
Creates a factory.

- `options` **[FactoryOptions](#FactoryOptions)** Factory options.

Returns a **[Factory](#factory)**

### `createNode([options])`
Creates a node.

- `options` **[FactoryOptions](#FactoryOptions)** Factory options.

Returns a **[Node](#Node)**

### `createNodeTests([options])`
Creates a node with custom configuration for tests.

- `options` **[FactoryOptions](#FactoryOptions)** Factory options.

Returns a **[Node](#Node)**

### `createTestsInterface([options])`
Creates an interface to setup and teardown IPFS nodes for tests.

- `options` **[FactoryOptions](#FactoryOptions)** Factory options.

Returns a **[TestsInterface](#TestsInterface)**
#### TestsInterface
`nodes` **Array** List of the created controlled nodes.
`node()` **Function** Creates a standalone node, this node will **NOT** be stopped by `teardown()`.
`setup(options)` **Function(**[FactoryOptions](#FactoryOptions)**)** Creates a controlled node.
`teardown()` **Function** Stops all controlled nodes created by `setup`

### `createServer([options])`
Create an Endpoint Server.

- `options` **[Object]** Factory options. Defaults to: `{ port: 43134 }`
  - `port` **number** Port to start the server on.

Returns a **Server**

### Factory

#### `tmpDir()`
Create a temporary repo to create controllers manually.

Returns **Promise&lt;String>** - Path to the repo.

#### `version()`
Get the version of the IPFS node.

Returns **Promise&lt;String>**

#### `spawn([options])`
Creates a controller for a IPFS node.
- `options` **[Object]** IPFS options https://github.com/ipfs/js-ipfs#ipfs-constructor

Returns **Promise&lt;[Controller](#controller)>**

### Node
Class node controller for a IPFS node.

#### `new Node(options)`

- `options` **[FactoryOptions](#FactoryOptions)**

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

### FactoryOptions

Type: [Object]

#### Properties
-   `remote` **[boolean]** Use remote endpoint to spawn the nodes. Defaults to `true` when not in node.
-   `host` **[string]** Remote endpoint host. (Defaults to localhost)
-   `port` **[number]** Remote endpoint port. (Defaults to 43134)
-   `secure` **[string]** Remote endpoint uses http or https. (Defaults to false)
-   `disposable` **[boolean]** A new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits.
-   `type` **[string]** The daemon type, see below the options:-   go - spawn go-ipfs daemon
    -   js - spawn js-ipfs daemon
    -   proc - spawn in-process js-ipfs instance
-   `env` **[Object]** Additional environment variables, passed to executing shell. Only applies for Daemon controllers.
-   `args` **[Array]** Custom cli args.
-   `ipfsHttp` **[Object]** Setup IPFS HTTP client to be used by ctl.
    -   `ipfsHttp.ref` **[Object]** Reference to a IPFS HTTP Client object. (defaults to the local require(`ipfs-http-client`))
    -   `ipfsHttp.path` **[string]** Path to a IPFS HTTP Client to be required. (defaults to the local require.resolve('ipfs-http-client'))
-   `ipfsApi` **[Object]** Setup IPFS API to be used by ctl.
    -   `ipfsApi.ref` **[Object]** Reference to a IPFS API object. (defaults to the local require(`ipfs`))
    -   `ipfsApi.path` **[string]** Path to a IPFS API implementation to be required. (defaults to the local require.resolve('ipfs'))
-   `ipfsBin` **[string]** Path to a IPFS exectutable . (defaults to the local 'js-ipfs/src/bin/cli.js')
-   `ipfsOptions` **[IpfsOptions]** Options for the IPFS instance


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
