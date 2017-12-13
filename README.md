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

> Control an ipfs node daemon using Node.js

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

### Local node

```js
// Start a disposable node, and get access to the api
// print the node id, and stop the temporary daemon

// IPFS_PATH will point to /tmp/ipfs_***** and will be
// cleaned up when the process exits.

const daemonFactory = require('ipfsd-ctl')
const local = daemonFactory.localController

local.spawn(function (err, ipfsd) {
  const ipfs = ipfsd.ctl
  const node = ipfsd.ctrl
  ipfs.id(function (err, id) {
    console.log(id)
    node.stopDaemon()
  })
})
```

### Remote node

```js
// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

// IPFS_PATH will point to /tmp/ipfs_***** and will be
// cleaned up when the process exits.

const daemonFactory = require('ipfsd-ctl')
const server = daemonFactory.server

server.start((err) => {
  if (err) {
    throw err
  }
  
  const remote = daemonFactory.remoteController(port || 9999)
  remote.spawn(function (err, controller) {
    const ipfsCtl = controller.ctl
    const ipfsCtrl = controller.ctrl
    ipfsCtl.id(function (err, id) {
      console.log(id)
      ipfsCtrl.stopDaemon()
      server.stop()
    })
  })  
})
```

It's also possible to start the server from `.aegir` `pre` and `post` hooks. 

```js
'use strict'

const server = require('./src').server

module.exports = {
  karma: {
    files: [{
      pattern: 'test/fixtures/**/*',
      watched: false,
      served: true,
      included: false
    }],
    singleRun: true
  },
  hooks: {
    browser: {
      pre: server.start,
      post: server.stop
    }
  }
}
```

## API

### Daemon Factory

#### Create factory

- `daemonFactory.localController` - create a local controller
- `daemonFactory.remoteController([port])` - create a remote controller, usable from browsers
  - This methods return a factory that exposes the `spawn` method, which allows spawning and controlling ipfs nodes
- `daemonFactory.server` - exposes `start` and `stop` methods to start and stop the bundled http server that is required to run the remote controller.

#### Spawn nodes

> Spawn either a js-ipfs or go-ipfs node through `localController` or `remoteController`

`spawn([options], cb)`

- `options` - is an optional object with various options and ipfs config parameters
  - `js` bool (default false) - spawn a js or go node (default go)
  - `init` bool (default true) - should the node be initialized
  - `start` bool (default true) - should the node be started
  - `repoPath` string - the repository path to use for this node, ignored if node is disposable
  - `disposable` bool - a new repo is created and initialized for each invocation
  - `args` - array of cmd line arguments to be passed to ipfs daemon
  - `config` - ipfs configuration options
  
 - `cb(err, {ctl: <ipfs-api instance>, ctrl: <Node (ctrl) instance>})` - a callback that receives an object with two members:
   - `ctl` an [ipfs-api](https://github.com/ipfs/js-ipfs-api) instance attached to the newly created ipfs node
   - `ctrl` an instance of a daemon controller object
   
   
### IPFS Client (ctl)

> An instance of [ipfs-api](https://github.com/ipfs/js-ipfs-api#api)


### IPFS Daemon Controller (ctrl)


#### `apiAddr` (getter) 

> Get the address (multiaddr) of connected IPFS API.

- returns multiaddr

#### `gatewayAddr` (getter) 

> Get the address (multiaddr) of connected IPFS HTTP Gateway.

- returns multiaddr

#### `repoPath` (getter)

> Get the current repo path.

- returns string

#### `started` (getter)

>  Is the node started.

- returns boolean
 
#### `init (initOpts, callback)`

> Initialize a repo.

- initOpts (optional) - options object with the following entries
  - keysize (default 2048) - The bit size of the identiy key.
  - directory (default IPFS_PATH) - The location of the repo.
  - function (Error, Node) callback - receives an instance of this Node on success or an instance of `Error` on failure


#### `shutdown (callback)`

> Delete the repo that was being used. If the node was marked as `disposable` this will be called automatically when the process is exited.

- function(Error) callback

#### `startDaemon (flags, callback)`

> Start the daemon.

- flags - Flags array to be passed to the `ipfs daemon` command.
- function(Error, IpfsApi)} callback - function that receives an instance of `ipfs-api` on success or an instance of `Error` on failure


#### `stopDaemon (callback)`

> Stop the daemon.

- function(Error) callback - function that receives an instance of `Error` on failure

#### `killProcess (callback)`

> Kill the `ipfs daemon` process.

First `SIGTERM` is sent, after 10.5 seconds `SIGKILL` is sent if the process hasn't exited yet.

- function() callback - Called once the process is killed


#### `daemonPid ()`

> Get the pid of the `ipfs daemon` process.

- returns the pid number


#### `getConfig (key, callback)`

> Call `ipfs config`

If no `key` is passed, the whole config is returned as an object.

- key (optional) - A specific config to retrieve.
- function(Error, (Object|string) callback - function that reseives an object or string on success or an `Error` instance on failure


#### `setConfig (key, value, callback)`

> Set a config value.

- key - the key to set 
- value - the value to set the key to
- function(Error) callback
  

#### `replaceConf (file, callback)`
> Replace the configuration with a given file

- file - path to the new config file
- function(Error) callback


#### `version (callback)`

> Get the version of ipfs

- function(Error, string) callback
   
For more details see https://ipfs.github.io/js-ipfsd-ctl/.

### Packaging

`ipfsd-ctl` can be packaged in Electron applications, but the ipfs binary
has to be excluded from asar (Electron Archives),
[read more about unpack files from asar](https://electron.atom.io/docs/tutorial/application-packaging/#adding-unpacked-files-in-asar-archive).
`ipfsd-ctl` will try to detect if used from within an `app.asar` archive
and tries to resolve ipfs from `app.asar.unpacked`. The ipfs binary is part of
the `go-ipfs-dep` module.

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
