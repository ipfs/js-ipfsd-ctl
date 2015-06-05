# ipfsd-ctl - Control an ipfs node daemon

This is a simple module to control an ipfs daemon.

Install:
```sh
npm install --save ipfsd-ctl
```


## Usage

IPFS daemons are already easy to start and stop, but this module is here to do it from javascript itself.

```js
// start a disposable node, and get access to the api
// print the node id, and kill the temporary daemon

// IPFS_PATH will point to /tmp/ipfs_***** and will be
// cleaned up when the process exits.

var ipfsd = require('ipfsd-ctl')

ipfsd.disposableApi(function (err, ipfs) {
  ipfs.id(function (err, id) {
    console.log(id)
    process.kill()
  })
})
```