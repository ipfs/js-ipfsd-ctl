ipfsd-ctl
=========

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freejs-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Dependency Status](https://david-dm.org/ipfs/js-ipfsd-ctl.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfsd-ctl)
[![Travis CI](https://travis-ci.org/ipfs/js-ipfsd-ctl.svg?branch=master)](https://travis-ci.org/ipfs/js-ipfsd-ctl)
[![Circle CI](https://circleci.com/gh/ipfs/js-ipfsd-ctl.svg?style=svg)](https://circleci.com/gh/ipfs/js-ipfsd-ctl)


> Control an ipfs node daemon using Node.js

## Installation

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

If you need want to use an existing ipfs installation you can set `$IPFS_EXEC=/path/to/ipfs` to ensure it uses that.
