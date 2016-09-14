# ipfsd-ctl

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Coverage Status](https://coveralls.io/repos/github/ipfs/js-ipfsd-ctl/badge.svg?branch=master)](https://coveralls.io/github/ipfs/js-ipfsd-ctl?branch=master)
[![Travis CI](https://travis-ci.org/ipfs/js-ipfsd-ctl.svg?branch=master)](https://travis-ci.org/ipfs/js-ipfsd-ctl)
[![Circle CI](https://circleci.com/gh/ipfs/js-ipfsd-ctl.svg?style=svg)](https://circleci.com/gh/ipfs/js-ipfsd-ctl)
[![Dependency Status](https://david-dm.org/ipfs/js-ipfsd-ctl.svg?style=flat-square)](https://david-dm.org/ipfs/js-ipfsd-ctl) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> Control an ipfs node daemon using Node.js

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#license)

## Install

Install:
```sh
npm install --save ipfsd-ctl
```

__The current go ipfs version used is v0.4.3-rc3__

## Usage

IPFS daemons are already easy to start and stop, but this module is here to do it from javascript itself.

```js
// start a disposable node, and get access to the api
// print the node id, and kill the temporary daemon

// IPFS_PATH will point to /tmp/ipfs_***** and will be
// cleaned up when the process exits.

const ipfsd = require('ipfsd-ctl')

ipfsd.create((err, node) => {
  if (err) throw err
  node.startDaemon((err) => {
    if (err) throw err
    const ipfs = node.apiCtl()
    ipfs.id((err, id) => {
      console.log(id)
      process.kill()
    })
  })
})
```

The daemon controller safely spawns the node for you and exposes you an ipfs API client through `node.apiCtl()`. __If the parent process exits, the daemon will also be killed__ ensuring that the daemon isn't left hanging.

This module works by downloading the binary once, on first use, if it detects that no current binary is available to use. So keep in mind that the first command executed might throw in some overhead.

If you want to use an existing ipfs installation you can set `$IPFS_EXEC=/path/to/ipfs` to ensure it uses that.

## API

## ipfsd

#### ipfsd.local(path, done)

#### ipfsd.create(opts, done)

## IPFSNode(path, opts, disposable)

#### node.init(initOpts, done)

#### node.shutdown(done)

#### node.startDaemon(done)

#### node.stopDaemon(done)

#### node.apiCtl(done)

#### node.daemonPid()

#### node.getConfig(key, done)

#### node.setConfig(key, value, done)

#### node.replaceConf(file, done)

#### node.version(done)

#### node.subprocess

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/ipfs/js-ipfsd-ctl/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
