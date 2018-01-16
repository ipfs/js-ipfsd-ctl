# ipfsd-ctl

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Coverage Status](https://coveralls.io/repos/github/ipfs/js-ipfsd-ctl/badge.svg?branch=master)](https://coveralls.io/github/ipfs/js-ipfsd-ctl?branch=master)
[![Travis CI](https://travis-ci.org/ipfs/js-ipfsd-ctl.svg?branch=master)](https://travis-ci.org/ipfs/js-ipfsd-ctl)
[![Circle CI](https://circleci.com/gh/ipfs/js-ipfsd-ctl.svg?style=svg)](https://circleci.com/gh/ipfs/js-ipfsd-ctl)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/4p9r12ch0jtthnha?svg=true)](https://ci.appveyor.com/project/wubalubadubdub/js-ipfsd-ctl-a9ywu)
[![Dependency Status](https://david-dm.org/ipfs/js-ipfsd-ctl.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfsd-ctl) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> Control an IPFS daemon using JavaScript in Node.js or in the Browser.

```
                                                                    +-----+                                   
                                                                    |  H  |                                   
                                                                    |  T  |                                   
    +-----------------------------+                                 |  T  |                                   
    |           Node.js           |  +-----------------------+      |  P  |    +-----------------------------+
    |                             |  |                       |      |     |    |          BROWSER            |
    | +-----------------------+   |  |       IPFS Daemon     |      |  S  |    |                             |
    | |   Local Daemon Ctrl   |   |  |                       |      |  E  |    |   +----------------------+  |
    | |                       +-------                       --------  R  -----|---- Remote Daemon Ctrl   |  |
    | +-----------------------+   |  +-----|-----------|-----+      |  V  |    |   |                      |  |
    |                             |        |           |            |  E  |    |   +----------------------+  |
    | +-----------------------+   |        |           |            |  R  |    |                             |
    | |       IPFS API        |   |        |           |            +-----+    |   +----------------------+  |
    | |                       -------------+           |                       |   |     IPFS API         |  |
    | +-----------------------+   |                    +-----------------------|----                      |  |
    |                             |                                            |   +----------------------+  |
    +-----------------------------+                                            +-----------------------------+
```

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Install

Install:
```sh
npm install --save ipfsd-ctl
```

## Usage

IPFS daemons are already easy to start and stop, but this module is here to do it from JavaScript itself.

### Spawn an IPFS daemon from Node.js

```js
// Start a disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const DaemonFactory = require('ipfsd-ctl')
const df = DaemonFactory.create()

df.spawn(function (err, ipfsd) {
  if (err) { throw err }
  
  ipfsd.api.id(function (err, id) {
    if (err) { throw err }
    
    console.log(id)
    ipfsd.stop()
  })
})
```

### Spawn an IPFS daemon from the Browser using the provided remote endpoint

```js
// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const DaemonFactory = require('ipfsd-ctl')

const port = 9999
const server = DaemonFactory.createServer(port)
const df = DaemonFactory.create({ remote: true, port: port })

server.start((err) => {
  if (err) { throw err }

  df.spawn((err, ipfsd) => {
    if (err) { throw err }

    ipfsd.api.id(function (err, id) {
      if (err) { throw err }
      
      console.log(id)
      ipfsd.stop(server.stop)
    })
  })
})
```

## Disposable vs non Disposable nodes

`ipfsd-ctl` can create two types of node controllers, `disposable` and `non-disposable`. A disposable node will be created on a temporary repo which will be optionally initialized and started (the default), as well cleaned up on process exit. A non-disposable node on the other hand, requires the user to initialize and start the node, as well as stop and cleanup after wards. Additionally, a non-disposable will allow you to pass a custom repo using the `repoPath` option, if the `repoPath` is not defined, it will use the default repo for the node type (`$HOME/.ipfs` or `$HOME/.jsipfs`). The `repoPath` parameter is ignored for disposable nodes, as there is a risk of deleting a live repo.

## IPFS executables

`ipfsd-ctl` no longer installs go-ipfs nor js-ipfs dependencies, instead it expects them to be provided by the parent project. In order to be able to use both go and js daemons, please make sure that your project includes these two npm packages as dependencies.

- `ipfs` - the js-ipfs implementation
- `go-ipfs-dep` - the packaged go-ipfs implementation

## API

### Daemon Factory Class

#### `DaemonFactory` - `const df = DaemonFactory.create([options])`

`DaemonFactory.create([options])` returns an object that will expose the `df.spawn` method

- `options` - an optional object with the following properties
  - `remote` bool - indicates if the factory should spawn local or remote nodes. By default, local nodes are spawned in Node.js and remote nodes are spawned in Browser environments.
  - `port` number - the port number to use for the remote factory. It should match the port on which `DaemonFactory.server` was started. Defaults to 9999.
  - `type` - the daemon type to create with this factory. See the section bellow for the supported types
  - `exec` - path to the desired IPFS executable to spawn, otherwise `ipfsd-ctl` will try to locate the correct one based on the `type`. In the case of `proc` type, exec is required and expects an IPFS coderef.
  
`ipfsd-ctl` allows spawning different IPFS implementations, such as:

- **`go`** - calling `DaemonFactory.create({type: 'go'})` will spawn a `go-ipfs` daemon.
- **`js`** - calling `DaemonFactory.create({type: 'js'})` will spawn a `js-ipfs` daemon.
- **`proc`** - calling `DaemonFactory.create({type: 'proc', exec: require('ipfs') })` will spawn an `in process js-ipfs node` using the provided code reference that implements the core IPFS API. Note that, `exec` option to `df.spawn()` is required if `type: 'proc'` is used.
  
#### DaemonFactory endpoint for remote spawning - `const server = `DaemonFactory.createServer([options]) `

`DaemonFactory.createServer` create an instance of the bundled REST API used by the remote controller.

- exposes `start` and `stop` methods to start and stop the http server endpoint.

#### Spawn a new daemon with `df.spawn`

Spawn either a js-ipfs or go-ipfs daemon

`df.spawn([options], callback)`

`options` is an optional object the following properties:
  - `init` bool (default true) - should the node be initialized
  - `start` bool (default true) - should the node be started
  - `repoPath` string - the repository path to use for this node, ignored if node is disposable
  - `disposable` bool (default false) - a new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits
  - `args` - array of cmd line arguments to be passed to ipfs daemon
  - `config` - ipfs configuration options

`callback` - is a function with the signature `function (err, ipfsd)` where:
  - `err` - is the error set if spawning the node is unsuccessful
  - `ipfsd` - is the daemon controller instance: 
    - `api` - a property of `ipfsd`, an instance of  [ipfs-api](https://github.com/ipfs/js-ipfs-api) attached to the newly created ipfs node   

### IPFS Daemon Controller (`ipfsd`)

The IPFS daemon controller (`ipfsd`) allows you to interact with the spawned IPFS daemon.

#### `ipfsd.apiAddr` (getter)

Get the address (multiaddr) of connected IPFS API. Returns a multiaddr

#### `ipfsd.gatewayAddr` (getter)

Get the address (multiaddr) of connected IPFS HTTP Gateway. Returns a multiaddr.

#### `ipfsd.repoPath` (getter)

Get the current repo path. Returns string.

#### `ipfsd.started` (getter)

Is the node started. Returns a boolean.
 
#### `init([initOpts], callback)`

Initialize a repo. 

`initOpts` (optional) is an object with the following properties:
  - `keysize` (default 2048) - The bit size of the identity key.
  - `directory` (default IPFS_PATH if defined, or ~/.ipfs for go-ipfs and ~/.jsipfs for js-ipfs) - The location of the repo.
 
`callback` is a function with the signature `function (Error, ipfsd)` where `err` is an Error in case something goes wrong and `ipfsd` is the daemon controller instance.

#### `ipfsd.cleanup(callback)`

Delete the repo that was being used. If the node was marked as `disposable` this will be called automatically when the process is exited.

`callback` is a function with the signature `function(err)`.

#### `ipfsd.start(flags, callback)`

Start the daemon.

`flags` - Flags array to be passed to the `ipfs daemon` command.

`callback` is a function with the signature `function(err, ipfsApi)` that receives an instance of `ipfs-api` on success or an instance of `Error` on failure


#### `ipfsd.stop([callback])`

Stop the daemon.

`callback` is a function with the signature `function(err)` callback - function that receives an instance of `Error` on failure

#### `ipfsd.killProcess([callback])`

Kill the `ipfs daemon` process.

First a `SIGTERM` is sent, after 10.5 seconds `SIGKILL` is sent if the process hasn't exited yet.

`callback` is a function with the signature `function()` called once the process is killed

#### `ipfsd.pid(callback)`

Get the pid of the `ipfs daemon` process. Returns the pid number

`callback` is a function with the signature `function(err, pid)` that receives the `pid` of the running daemon or an `Error` instance on failure

#### `ipfsd.getConfig([key], callback)`

Returns the output of an `ipfs config` command. If no `key` is passed, the whole config is returned as an object.

`key` (optional) - A specific config to retrieve.

`callback` is a function with the signature `function(err, (Object|string))` that receives an object or string on success or an `Error` instance on failure

#### `ipfsd.setConfig(key, value, callback)`

Set a config value.

`key` - the key of the config entry to change/set 

`value` - the config value to change/set

`callback` is a function with the signature `function(err)` callback - function that receives an `Error` instance on failure

#### `ipfsd.version(callback)`

Get the version of ipfs

`callback` is a function with the signature `function(err, version)`
   
### IPFS Client (`ipfsd.api`)

An instance of [ipfs-api](https://github.com/ipfs/js-ipfs-api#api) that is used to interact with the daemon.

This instance is returned for each successfully started IPFS daemon, when either `df.spawn({start: true})` (the default) is called, or `ipfsd.start()` is invoked in the case of nodes that were spawned with `df.spawn({start: false})`. 
   
### Packaging

`ipfsd-ctl` can be packaged in Electron applications, but the ipfs binary has to be excluded from asar (Electron Archives).
[read more about unpack files from asar](https://electron.atom.io/docs/tutorial/application-packaging/#adding-unpacked-files-in-asar-archive).

`ipfsd-ctl` will try to detect if used from within an `app.asar` archive and tries to resolve ipfs from `app.asar.unpacked`. The ipfs binary is part of the `go-ipfs-dep` module.

```bash
electron-packager ./ --asar.unpackDir=node_modules/go-ipfs-dep
```

See [electron asar example](https://github.com/ipfs/js-ipfsd-ctl/tree/master/examples/electron-asar/)

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/js-ipfsd-ctl/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
