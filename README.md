# ipfsd-ctl

[![ipfs.tech](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](https://ipfs.tech)
[![Discuss](https://img.shields.io/discourse/https/discuss.ipfs.tech/posts.svg?style=flat-square)](https://discuss.ipfs.tech)
[![codecov](https://img.shields.io/codecov/c/github/ipfs/js-ipfsd-ctl.svg?style=flat-square)](https://codecov.io/gh/ipfs/js-ipfsd-ctl)
[![CI](https://img.shields.io/github/actions/workflow/status/ipfs/js-ipfsd-ctl/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/ipfs/js-ipfsd-ctl/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Spawn IPFS Daemons, Kubo or...

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

This module allows you to spawn long-lived IPFS implementations from any JS
environment and interact with the as is they were in the local process.

It is designed mostly for testing interoperability and is not suitable for
production use.

## Spawning a single noder: `createNode`

## Example - Spawning a Kubo node

```TypeScript
import { createNode } from 'ipfsd-ctl'
import { path } from 'kubo'
import { create } from 'kubo-rpc-client'

const node = await createNode({
  type: 'kubo',
  rpc: create,
  bin: path()
})

console.info(await node.api.id())
```

## Manage multiple nodes: `createFactory`

Use a factory to spawn multiple nodes based on some common template.

## Example - Spawning multiple Kubo nodes

```TypeScript
import { createFactory } from 'ipfsd-ctl'
import { path } from 'kubo'
import { create } from 'kubo-rpc-client'

const factory = createFactory({
  type: 'kubo',
  rpc: create,
  bin: path()
})

const node1 = await factory.spawn()
const node2 = await factory.spawn()
//...etc

// later stop all nodes
await factory.clean()
```

## Override config based on implementation type

`createFactory` takes a second argument that can be used to pass default
options to an implementation based on the `type` field.

```TypeScript
import { createFactory } from 'ipfsd-ctl'
import { path } from 'kubo'
import { create } from 'kubo-rpc-client'

const factory = createFactory({
  type: 'kubo',
  test: true
}, {
  otherImpl: {
    //...other impl args
  }
})

const kuboNode = await factory.spawn()
const otherImplNode = await factory.spawn({
  type: 'otherImpl'
})
```

## Spawning nodes from browsers

To spawn nodes from browsers, first start an ipfsd-ctl server from node.js
and make the address known to the browser (the default way is to set
`process.env.IPFSD_CTL_SERVER` in your bundle):

## Example - Create server

In node.js:

```TypeScript
// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

import { createServer } from 'ipfsd-ctl'

const port = 9090
const server = Ctl.createServer(port, {
  type: 'kubo',
  test: true
}, {
   // overrides
})
await server.start()
```

In a browser:

```TypeScript
import { createFactory } from 'ipfsd-ctl'

const factory = createFactory({
  // or you can set process.env.IPFSD_CTL_SERVER to http://localhost:9090
  endpoint: `http://localhost:${port}`
})

const node = await factory.createNode({
  type: 'kubo'
})
console.info(await node.api.id())
```

## Disposable vs non Disposable nodes

`ipfsd-ctl` can spawn `disposable` and `non-disposable` nodes.

- `disposable`- Disposable nodes are useful for tests or other temporary use cases, they create a temporary repo which is deleted automatically when the node is stopped
- `non-disposable` - Disposable nodes will not delete their repo when stopped

# Install

```console
$ npm i ipfsd-ctl
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `IpfsdCtl` in the global namespace.

```html
<script src="https://unpkg.com/ipfsd-ctl/dist/index.min.js"></script>
```

# API Docs

- <https://ipfs.github.io/js-ipfsd-ctl>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribute

Contributions welcome! Please check out [the issues](https://github.com/ipfs/js-ipfsd-ctl/issues).

Also see our [contributing document](https://github.com/ipfs/community/blob/master/CONTRIBUTING_JS.md) for more information on how we work, and about contributing in general.

Please be aware that all interactions related to this repo are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)
