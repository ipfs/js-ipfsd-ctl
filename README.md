# ipfsd-ctl, the IPFS Factory.

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Coverage Status](https://coveralls.io/repos/github/ipfs/js-ipfsd-ctl/badge.svg?branch=master)](https://coveralls.io/github/ipfs/js-ipfsd-ctl?branch=master)
[![Travis CI](https://travis-ci.org/ipfs/js-ipfsd-ctl.svg?branch=master)](https://travis-ci.org/ipfs/js-ipfsd-ctl)
[![Circle CI](https://circleci.com/gh/ipfs/js-ipfsd-ctl.svg?style=svg)](https://circleci.com/gh/ipfs/js-ipfsd-ctl)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/4p9r12ch0jtthnha?svg=true)](https://ci.appveyor.com/project/wubalubadubdub/js-ipfsd-ctl-a9ywu)
[![Dependency Status](https://david-dm.org/ipfs/js-ipfsd-ctl.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfsd-ctl)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> Spawn IPFS daemons using JavaScript!

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

const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create()

f.spawn(function (err, ipfsd) {
  if (err) { throw err }
  
  ipfsd.api.id(function (err, id) {
    if (err) { throw err }
    
    console.log(id)
    ipfsd.stop()
  })
})
```

**Spawn an IPFS daemon from the Browser using the provided remote endpoint**

```js
// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const IPFSFactory = require('ipfsd-ctl')

const port = 9090
const server = IPFSFactory.createServer(port)
const f = IPFSFactory.create({ remote: true, port: port })

server.start((err) => {
  if (err) { throw err }

  f.spawn((err, ipfsd) => {
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

`ipfsd-ctl` can spawn `disposable` and `non-disposable` daemons.

- `disposable`- Creates on a temporary repo which will be optionally initialized and started (the default), as well cleaned up on process exit. Great for tests.
- `non-disposable` - Requires the user to initialize and start the node, as well as stop and cleanup after wards. Additionally, a non-disposable will allow you to pass a custom repo using the `repoPath` option, if the `repoPath` is not defined, it will use the default repo for the node type (`$HOME/.ipfs` or `$HOME/.jsipfs`). The `repoPath` parameter is ignored for disposable nodes, as there is a risk of deleting a live repo.

## Batteries not included. Bring your own IPFS executable.

Install one or both of the following modules:

- `ipfs` - `> npm i ipfs` - If you want to spawn js-ipfs nodes and/or daemons.
- `go-ipfs-dep` - `> npm i go-ipfs-dep` - If you want to spwan go-ipfs daemons.

## API

### `IPFSFactory` - `const f = IPFSFactory.create([options])`

`IPFSFactory.create([options])` returns an object that will expose the `df.spawn` method

- `options` - optional object with:
  - `remote` bool - use remote endpoint to spawn the nodes.
  - `port` number - remote endpoint point. Defaults to 43134.
  - `exec` - IPFS executable path. `ipfsd-ctl` will attempt to locate it by default. If you desire to spawn js-ipfs instances in the same process, pass the ref to the module instead (e.g `exec: require('ipfs')`)
  - `type` - the daemon type, see below the options
    - `go` - spawn go-ipfs daemon
    - `js` - spawn js-ipfs daemon
    - `proc` - spawn in-process js-ipfs instance. Needs to be called also with exec. Example: `DaemonFactory.create({type: 'proc', exec: require('ipfs') })`.

**example:** See [Usage](#usage)

#### Spawn a daemon with `f.spawn([options], callback)`

Spawn the daemon

- `options` is an optional object the following properties:
  - `init` bool (default true) or Object - should the node be initialized
  - `initOptions` object - should be of the form `{bits: <size>}`, which sets the desired key size
  - `start` bool (default true) - should the node be started
  - `repoPath` string - the repository path to use for this node, ignored if node is disposable
  - `disposable` bool (default true) - a new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits
  - `defaultAddrs` bool (default false) - use the daemon default `Swarm` addrs
  - `args` - array of cmd line arguments to be passed to ipfs daemon
  - `config` - ipfs configuration options

- `callback` - is a function with the signature `function (err, ipfsd)` where:
  - `err` - is the error set if spawning the node is unsuccessful
  - `ipfsd` - is the daemon controller instance: 
    - `api` - a property of `ipfsd`, an instance of  [ipfs-api](https://github.com/ipfs/js-ipfs-api) attached to the newly created ipfs node   

**example:** See [Usage](#usage)

#### Get daemon version with `f.version(callback)`

Get the version without spawning a daemon

- `callback` - is a function with the signature `function(err, version)`, where version might be one of the following:
    - if `type` is 'go' a version string like `ipfs version <version number>`
    - if `type` is 'js' a version string like `js-ipfs version: <version number>`
     - if `type` is 'proc' an object with the following properties:
        - version - the ipfs version
        - repo - the repo version
        - commit - the commit hash for this version

### Remote endpoint - `const server = `IPFSFactory.createServer([options]) `

`IPFSFactory.createServer` starts a IPFSFactory endpoint.

**example:** 
```
const IPFSFactory = require('ipfsd-ctl')

const server = IPFSFactory.createServer({ port: 12345 })

server.start((err) => {
  if (err) { throw err }

  console.log('endpoint is running')

  server.stop((err) => {
    if (err) { throw err }

    console.log('endpoint has stopped')
  })
})
```

### IPFS Daemon Controller - `ipfsd`

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
  - `pass` (optional) - The passphrase of the key chain.
 
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
   
### IPFS HTTP Client  - `ipfsd.api`

An instance of [ipfs-api](https://github.com/ipfs/js-ipfs-api#api) that is used to interact with the daemon.

This instance is returned for each successfully started IPFS daemon, when either `df.spawn({start: true})` (the default) is called, or `ipfsd.start()` is invoked in the case of nodes that were spawned with `df.spawn({start: false})`.
   
## ipfsd-ctl environment variables

In additional to the API described in previous sections, `ipfsd-ctl` also supports several environment variables. This are often very useful when running in different environments, such as CI or when doing integration/interop testing.

_Environment variables precedence order is as follows. Top to bottom, top entry has highest precedence:_

- command line options/method arguments
- env variables
- default values

Meaning that, environment variables override defaults in the configuration file but are superseded by options to `df.spawn({...})`

#### IPFS_JS_EXEC and IPFS_GO_EXEC

An alternative way of specifying the executable path for the `js-ipfs` or `go-ipfs` executable, respectively.
   
## Packaging

`ipfsd-ctl` can be packaged in Electron applications, but the ipfs binary has to be excluded from asar (Electron Archives).
[read more about unpack files from asar](https://electron.atom.io/docs/tutorial/application-packaging/#adding-unpacked-files-in-asar-archive).

`ipfsd-ctl` will try to detect if used from within an `app.asar` archive and tries to resolve ipfs from `app.asar.unpacked`. The ipfs binary is part of the `go-ipfs-dep` module.

```bash
electron-packager ./ --asar.unpackDir=node_modules/go-ipfs-dep
```

See [electron asar example](https://github.com/ipfs/js-ipfsd-ctl/tree/master/examples/electron-asar/)

## Development

Project structure:

```
src
├── defaults
│   ├── config.json
│   └── options.json
├── endpoint                    # endpoint to support remote spawning
│   ├── routes.js
│   └── server.js
├── factory-client.js           # IPFS Factories: client (remote), daemon (go or js) and in-proc (js)
├── factory-daemon.js
├── factory-in-proc.js
├── index.js
├── ipfsd-client.js             # ipfsd (Daemon Controller): client (remote), daemon (go or js), in-proc (js)
├── ipfsd-daemon.js
├── ipfsd-in-proc.js
└── utils                       # Utils used by the Factories and Daemon Controllers
    ├── configure-node.js
    ├── exec.js
    ├── find-ipfs-executable.js
    ├── flatten.js
    ├── parse-config.js
    ├── repo
    │   ├── create-browser.js
    │   └── create-nodejs.js
    ├── run.js
    ├── set-config-value.js
    └── tmp-dir.js

4 directories, 21 files
```

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/js-ipfsd-ctl/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
