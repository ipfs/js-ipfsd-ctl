# ipfsd-ctl - Control an ipfs node daemon

This is a simple module to control an ipfs daemon.

Install:
```sh
npm install --save ipfsd-ctl
```


## Usage

IPFS daemons are already easy to start and stop, but this module is here to do it from javascript itself.

```js
var ipfsdctl = require('ipfsd-ctl')

// construct a "node" instance, which has a specific path.
// path could default to __directory/.ipfs or something.
var node = ipfsdctl(path)

// init a node
node.init(opts, cb)  // opts - options to init, e.g. {bits: <int>, ...}

// start a node
node.daemon(opts, cb) // opts - options to `ipfs daemon`, as in the cli
node.start (alias to node.daemon)

// stop (kill) a node
node.stop(cb)
```
