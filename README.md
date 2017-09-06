# ipfsd-ctl

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Coverage Status](https://coveralls.io/repos/github/ipfs/js-ipfsd-ctl/badge.svg?branch=master)](https://coveralls.io/github/ipfs/js-ipfsd-ctl?branch=master)
[![Travis CI](https://travis-ci.org/ipfs/js-ipfsd-ctl.svg?branch=master)](https://travis-ci.org/ipfs/js-ipfsd-ctl)
[![Circle CI](https://circleci.com/gh/ipfs/js-ipfsd-ctl.svg?style=svg)](https://circleci.com/gh/ipfs/js-ipfsd-ctl)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/4p9r12ch0jtthnha?svg=true)](https://ci.appveyor.com/project/diasdavid/js-ipfsd-ctl-a9ywu)
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

## Usage

IPFS daemons are already easy to start and stop, but this module is here to do it from JavaScript itself.

```js
// Start a disposable node, and get access to the api
// print the node id, and kill the temporary daemon

// IPFS_PATH will point to /tmp/ipfs_***** and will be
// cleaned up when the process exits.

var ipfsd = require('ipfsd-ctl')

ipfsd.disposableApi(function (err, ipfs) {
  ipfs.id(function (err, id) {
    console.log(id)
    process.exit()
  })
})
```

If you need want to use an existing ipfs installation you can set `$IPFS_EXEC=/path/to/ipfs` to ensure it uses that.

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
