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

Please ensure your project also has dependencies on `ipfs`, `ipfs-http-client` and `go-ipfs`.

```sh
npm install --save ipfs
npm install --save ipfs-http-client
npm install --save go-ipfs
```

If you are only going to use the `go` implementation of IPFS, you can skip installing the `js` implementation and vice versa, though both will require the `ipfs-http-client` module.

If you are only using the `proc` type in-process IPFS node, you can skip installing `go-ipfs` and `ipfs-http-client`.

> You also need to explicitly defined the options `ipfsBin`, `ipfsModule` and `ipfsHttpModule` according to your needs.  Check [ControllerOptions](#controlleroptions) and [ControllerOptionsOverrides](#controlleroptionsoverrides) for more information.

## Usage

### Spawning a single IPFS controller: `createController`

This is a shorthand for simpler use cases where factory is not needed.

```js
// No need to create a factory when only a single controller is needed.
// Use createController to spawn it instead.
const Ctl = require('ipfsd-ctl')
const ipfsd = await Ctl.createController({
    ipfsHttpModule: require('ipfs-http-client'),
    ipfsBin: require('go-ipfs').path()
})
const id = await ipfsd.api.id()

console.log(id)

await ipfsd.stop()
```

### Manage multiple IPFS controllers: `createFactory`

Use a factory to spawn multiple controllers based on some common template.

**Spawn an IPFS daemon from Node.js**

```js
// Create a factory to spawn two test disposable controllers, get access to an IPFS api
// print node ids and clean all the controllers from the factory.
const Ctl = require('ipfsd-ctl')

const factory = Ctl.createFactory(
    {
        type: 'js',
        test: true,
        disposable: true,
        ipfsHttpModule: require('ipfs-http-client'),
        ipfsModule: require('ipfs') // only if you gonna spawn 'proc' controllers
    },
    { // overrides per type
        js: {
            ipfsBin: 'path/js/ipfs/bin'
        },
        go: {
            ipfsBin: 'path/go/ipfs/bin'
        }
    }
)
const ipfsd1 = await factory.spawn() // Spawns using options from `createFactory`
const ipfsd2 = await factory.spawn({ type: 'go' }) // Spawns using options from `createFactory` but overrides `type` to spawn a `go` controller

console.log(await ipfsd1.api.id())
console.log(await ipfsd2.api.id())

await factory.clean() // Clean all the controllers created by the factory calling `stop` on all of them.
```

**Spawn an IPFS daemon from the Browser using the provided remote endpoint**

```js
// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const Ctl = require('ipfsd-ctl')

const port = 9090
const server = Ctl.createServer(port, {
    ipfsModule: require('ipfs'),
    ipfsHttpModule: require('ipfs-http-client')
},
{
    js: {
        ipfsBin: 'path/js/ipfs/bin'
    },
    go: {
        ipfsBin: 'path/go/ipfs/bin'
    },
})
const factory = Ctl.createFactory({
    ipfsHttpModule: require('ipfs-http-client'),
    remote: true,
    endpoint: `http://localhost:${port}` // or you can set process.env.IPFSD_CTL_SERVER to http://localhost:9090
})

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

- `options` **[ControllerOptions](#controlleroptions)** Controllers options.
- `overrides` **[ControllerOptionsOverrides](#controlleroptionsoverrides)** Pre-defined options overrides per controller type.

Returns a **[Factory](#factory)**

### `createController([options])`
Creates a controller.

- `options` **[ControllerOptions](#controlleroptions)** Factory options.

Returns **Promise&lt;[Controller](#controller)>**

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
- `options` **[ControllerOptions](#controlleroptions)** Factory options.

Returns **Promise&lt;[Controller](#controller)>**

#### `clean()`
Cleans all controllers spawned.

Returns **Promise&lt;[Factory](#factory)>**

### Controller
Class controller for a IPFS node.

#### `new Controller(options)`

- `options` **[ControllerOptions](#controlleroptions)**

#### `path`
**String** Repo path.

#### `exec`
**String** Executable path.

#### `env`
**Object** ENV object.

#### `initialized`
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
-   `js` **[[ControllerOptions](#controlleroptions)]** Pre-defined defaults options for **JS** controllers these are deep merged with options passed to `Factory.spawn(options)`.
-   `go` **[[ControllerOptions](#controlleroptions)]** Pre-defined defaults options for **Go** controllers these are deep merged with options passed to `Factory.spawn(options)`.
-   `proc` **[[ControllerOptions](#controlleroptions)]** Pre-defined defaults options for **Proc** controllers these are deep merged with options passed to `Factory.spawn(options)`.


### ControllerOptions

Type: [Object]

#### Properties
-   `test` **[boolean]** Flag to activate custom config for tests.
-   `remote` **[boolean]** Use remote endpoint to spawn the nodes. Defaults to `true` when not in node.
-   `endpoint` **[string]** Endpoint URL to manage remote Controllers. (Defaults: 'http://localhost:43134').
-   `disposable` **[boolean]** A new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits.
-   `type` **[string]** The daemon type, see below the options:
    -   go - spawn go-ipfs daemon
    -   js - spawn js-ipfs daemon
    -   proc - spawn in-process js-ipfs node
-   `env` **[Object]** Additional environment variables, passed to executing shell. Only applies for Daemon controllers.
-   `args` **[Array]** Custom cli args.
-   `ipfsHttpModule` **[Object]** Reference to a IPFS HTTP Client object.
-   `ipfsModule` **[Object]** Reference to a IPFS API object.
-   `ipfsBin` **[string]** Path to a IPFS exectutable.
-   `ipfsOptions` **[IpfsOptions]** Options for the IPFS instance same as https://github.com/ipfs/js-ipfs#ipfs-constructor. `proc` nodes receive these options as is, daemon nodes translate the options as far as possible to cli arguments.
- `forceKill` **[boolean]** - Whether to use SIGKILL to quit a daemon that does not stop after `.stop()` is called. (default `true`)
- `forceKillTimeout` **[Number]** - How long to wait before force killing a daemon in ms. (default `5000`)


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

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)

## License

[MIT](LICENSE)
