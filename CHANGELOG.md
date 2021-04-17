## [8.0.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v8.0.1...v8.0.2) (2021-04-17)



## [8.0.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v8.0.0...v8.0.1) (2021-04-09)



# [8.0.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v7.2.0...v8.0.0) (2021-03-26)


### chore

* use .create function for http client and ipfs client ([#616](https://github.com/ipfs/js-ipfsd-ctl/issues/616)) ([d2f623a](https://github.com/ipfs/js-ipfsd-ctl/commit/d2f623a82f33d63959f95a4238cc8e2d6f0415a0)), closes [ipfs/js-ipfs#3550](https://github.com/ipfs/js-ipfs/issues/3550)


### BREAKING CHANGES

* expects `ipfs-http-client` and `ipfs-client` to export a `.create` function



# [7.2.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v7.1.1...v7.2.0) (2020-12-18)


### Features

* expose gRPC addr on daemon ([#561](https://github.com/ipfs/js-ipfsd-ctl/issues/561)) ([1bed9f0](https://github.com/ipfs/js-ipfsd-ctl/commit/1bed9f011b9541de5e84e93e7983acd9aa72c451))



## [7.1.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v7.1.0...v7.1.1) (2020-12-03)



# [7.1.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v7.0.3...v7.1.0) (2020-10-28)


### Features

* support more cli args ([#557](https://github.com/ipfs/js-ipfsd-ctl/issues/557)) ([2ee20b3](https://github.com/ipfs/js-ipfsd-ctl/commit/2ee20b3ff469f631296585086d55a1da6a22331b))



## [7.0.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v7.0.2...v7.0.3) (2020-10-23)


### Bug Fixes

* kill disposable nodes on stop and simplify started status ([#554](https://github.com/ipfs/js-ipfsd-ctl/issues/554)) ([cd123cc](https://github.com/ipfs/js-ipfsd-ctl/commit/cd123ccd4cebfa7acb68416f5933ef38cd9e1ff9))



<a name="7.0.2"></a>
## [7.0.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v7.0.1...v7.0.2) (2020-10-10)


### Bug Fixes

* use native fetch if available ([#551](https://github.com/ipfs/js-ipfsd-ctl/issues/551)) ([c471ac8](https://github.com/ipfs/js-ipfsd-ctl/commit/c471ac8))


### Features

* go-ipfs 0.7.0 compatibility ([#549](https://github.com/ipfs/js-ipfsd-ctl/issues/549)) ([e05a31e](https://github.com/ipfs/js-ipfsd-ctl/commit/e05a31e))



<a name="7.0.1"></a>
## [7.0.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v7.0.0...v7.0.1) (2020-09-17)


### Bug Fixes

* allow enabling sharding ([#547](https://github.com/ipfs/js-ipfsd-ctl/issues/547)) ([39842ae](https://github.com/ipfs/js-ipfsd-ctl/commit/39842ae))



<a name="7.0.0"></a>
# [7.0.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v6.0.0...v7.0.0) (2020-08-25)


### Chores

* update deps ([#541](https://github.com/ipfs/js-ipfsd-ctl/issues/541)) ([dcd160a](https://github.com/ipfs/js-ipfsd-ctl/commit/dcd160a))


### BREAKING CHANGES

* - Hapi has dropped support for node < 12



<a name="6.0.0"></a>
# [6.0.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v5.0.0...v6.0.0) (2020-08-12)



<a name="5.0.0"></a>
# [5.0.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v4.1.1...v5.0.0) (2020-07-16)


### Features

* swap go-ipfs-dep for go-ipfs ([#522](https://github.com/ipfs/js-ipfsd-ctl/issues/522)) ([c8c64b0](https://github.com/ipfs/js-ipfsd-ctl/commit/c8c64b0))


### BREAKING CHANGES

* Previously dependent projects should also depend on go-ipfs-dep, now they should depend on go-ipfs instead



<a name="4.1.1"></a>
## [4.1.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v4.1.0...v4.1.1) (2020-05-13)


### Bug Fixes

* remove onBlocked hook from delete database ([#509](https://github.com/ipfs/js-ipfsd-ctl/issues/509)) ([e4d6f80](https://github.com/ipfs/js-ipfsd-ctl/commit/e4d6f80))



<a name="4.1.0"></a>
# [4.1.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v4.0.2...v4.1.0) (2020-04-29)


### Features

* remove default key size and upgrade go-ipfs ([#504](https://github.com/ipfs/js-ipfsd-ctl/issues/504)) ([ecbf4be](https://github.com/ipfs/js-ipfsd-ctl/commit/ecbf4be))



<a name="4.0.2"></a>
## [4.0.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v4.0.1...v4.0.2) (2020-04-29)


### Bug Fixes

* pin go-ipfs to 0.4.23-3 ([11976f1](https://github.com/ipfs/js-ipfsd-ctl/commit/11976f1))



<a name="4.0.1"></a>
## [4.0.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v4.0.0...v4.0.1) (2020-04-20)


### Bug Fixes

* remove aegir from production code ([61b5ea5](https://github.com/ipfs/js-ipfsd-ctl/commit/61b5ea5)), closes [#501](https://github.com/ipfs/js-ipfsd-ctl/issues/501)



<a name="4.0.0"></a>
# [4.0.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v3.1.0...v4.0.0) (2020-04-20)


### Bug Fixes

* move IPFS_PATH test to a node specific file ([9d9cedd](https://github.com/ipfs/js-ipfsd-ctl/commit/9d9cedd))
* revert boom and hapi ([a92177f](https://github.com/ipfs/js-ipfsd-ctl/commit/a92177f))
* use IPFS_PATH env var ([708c7cc](https://github.com/ipfs/js-ipfsd-ctl/commit/708c7cc)), closes [#497](https://github.com/ipfs/js-ipfsd-ctl/issues/497)


### Features

* ipfsd-ctl server can find free ports ([db64997](https://github.com/ipfs/js-ipfsd-ctl/commit/db64997))
* update deps and remove support for node 8 ([2565199](https://github.com/ipfs/js-ipfsd-ctl/commit/2565199))


### BREAKING CHANGES

* node 8 support removed



<a name="3.1.0"></a>
# [3.1.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v3.0.0...v3.1.0) (2020-04-14)


### Bug Fixes

* remove node globals ([5fcc4fc](https://github.com/ipfs/js-ipfsd-ctl/commit/5fcc4fc))
* swap ky for ipfs-utils http ([0539ac3](https://github.com/ipfs/js-ipfsd-ctl/commit/0539ac3))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v2.1.0...v3.0.0) (2020-02-10)


### Code Refactoring

* remove option normalisation ([#454](https://github.com/ipfs/js-ipfsd-ctl/issues/454)) ([f1e5c82](https://github.com/ipfs/js-ipfsd-ctl/commit/f1e5c82))
* remove path and ref from module args also findBin ([#458](https://github.com/ipfs/js-ipfsd-ctl/issues/458)) ([7049cc9](https://github.com/ipfs/js-ipfsd-ctl/commit/7049cc9))


### BREAKING CHANGES

* - `.path` and `.ref` args removed from `ipfsModule` and `ipfsHttpModule`
- `findBin` function removed

* chore: update dep versions

* chore: increase test timeouts

* fix: only get go-ipfs path in node

* fix: linting

Co-authored-by: Alex Potsides <alex@achingbrain.net>
* ipfsd-ctl no longer defaults to a local ipfs, ipfs-http-client or ipfs bin, now the user needs to set those packages when creating controllers and remote controller server.



<a name="2.1.0"></a>
# [2.1.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v2.0.0...v2.1.0) (2020-01-31)


### Bug Fixes

* downgrade ky ([#452](https://github.com/ipfs/js-ipfsd-ctl/issues/452)) ([a4c34e6](https://github.com/ipfs/js-ipfsd-ctl/commit/a4c34e6))
* only find bin if not overridden ([#448](https://github.com/ipfs/js-ipfsd-ctl/issues/448)) ([025c06f](https://github.com/ipfs/js-ipfsd-ctl/commit/025c06f))
* only require http api client if it has not been specified ([#450](https://github.com/ipfs/js-ipfsd-ctl/issues/450)) ([6b21d5b](https://github.com/ipfs/js-ipfsd-ctl/commit/6b21d5b))
* protect possible empty ipfsModule option ([#449](https://github.com/ipfs/js-ipfsd-ctl/issues/449)) ([09b1917](https://github.com/ipfs/js-ipfsd-ctl/commit/09b1917))



<a name="2.0.0"></a>
# [2.0.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v1.0.7...v2.0.0) (2020-01-29)


### Bug Fixes

* do not send code refs over http ([#442](https://github.com/ipfs/js-ipfsd-ctl/issues/442)) ([9cbf329](https://github.com/ipfs/js-ipfsd-ctl/commit/9cbf329))


### Features

* force kill daemons after timeout ([#441](https://github.com/ipfs/js-ipfsd-ctl/issues/441)) ([182e532](https://github.com/ipfs/js-ipfsd-ctl/commit/182e532)), closes [#438](https://github.com/ipfs/js-ipfsd-ctl/issues/438)
* move ipfs to peer deps ([#446](https://github.com/ipfs/js-ipfsd-ctl/issues/446)) ([236c935](https://github.com/ipfs/js-ipfsd-ctl/commit/236c935))


### BREAKING CHANGES

* This package now requires the user to bring their own version, but they can also skip installing go-IPFS if, for example, they are only going
to use js-IPFS.



<a name="1.0.7"></a>
## [1.0.7](https://github.com/ipfs/js-ipfsd-ctl/compare/v1.0.6...v1.0.7) (2020-01-24)



<a name="1.0.6"></a>
## [1.0.6](https://github.com/ipfs/js-ipfsd-ctl/compare/v1.0.5...v1.0.6) (2020-01-17)


### Bug Fixes

* find bin top to bottom instead of the inverse ([bc847fb](https://github.com/ipfs/js-ipfsd-ctl/commit/bc847fb))



<a name="1.0.5"></a>
## [1.0.5](https://github.com/ipfs/js-ipfsd-ctl/compare/v1.0.4...v1.0.5) (2020-01-16)



<a name="1.0.4"></a>
## [1.0.4](https://github.com/ipfs/js-ipfsd-ctl/compare/v1.0.3...v1.0.4) (2020-01-16)


### Bug Fixes

* remove swarm addrs in browser ([#435](https://github.com/ipfs/js-ipfsd-ctl/issues/435)) ([39b324e](https://github.com/ipfs/js-ipfsd-ctl/commit/39b324e)), closes [/github.com/libp2p/js-libp2p/blob/83409deaa6773a550d38b77bd486faf8b8b97d29/src/transport-manager.js#L172-L176](https://github.com//github.com/libp2p/js-libp2p/blob/83409deaa6773a550d38b77bd486faf8b8b97d29/src/transport-manager.js/issues/L172-L176)



<a name="1.0.3"></a>
## [1.0.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v1.0.2...v1.0.3) (2020-01-16)


### Bug Fixes

* add endpoint option to the docs ([3e61a00](https://github.com/ipfs/js-ipfsd-ctl/commit/3e61a00))
* set profiles option if profiles array not empty ([#433](https://github.com/ipfs/js-ipfsd-ctl/issues/433)) ([12a2b6c](https://github.com/ipfs/js-ipfsd-ctl/commit/12a2b6c))



<a name="1.0.2"></a>
## [1.0.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v1.0.0...v1.0.2) (2019-12-11)



<a name="1.0.0"></a>
# [1.0.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.47.4...v1.0.0) (2019-12-11)


### Features

* new ctl ([#395](https://github.com/ipfs/js-ipfsd-ctl/issues/395)) ([3dae276](https://github.com/ipfs/js-ipfsd-ctl/commit/3dae276))


### BREAKING CHANGES

* Problems:
- Browsers tests skipped cause ctl didn't support proper connectivity to remote nodes
- We weren't able to tell ctl to use a specific commit of http-client, js-ipfs or cli
- Options/config between the 3 types of daemons weren't consistent
- Ctl didn't support remote "in process" daemon
- IPFS options were handled manually inside ctl, so any change in js-ipfs would require a PR in ctl to support the new options or change to an option

Related issues:
- https://github.com/ipfs/js-ipfsd-ctl/issues/208
- https://github.com/ipfs/js-ipfsd-ctl/issues/397
- https://github.com/ipfs/js-ipfsd-ctl/issues/374
- https://github.com/ipfs/js-ipfsd-ctl/issues/315
- https://github.com/ipfs/js-ipfsd-ctl/issues/207
- https://github.com/ipfs/js-ipfsd-ctl/issues/217
- and more

Improvements:
- better errors
- DEBUG='ipfsd-ctl:*' everywhere
- factories for tests with good defaults
- options are properly merged everywhere
- safer child_process exit `stop()`
- faster stop()
- IPFS Options are now the same format as https://github.com/ipfs/js-ipfs/blob/master/README.md#ipfs-constructor
- Ctl can init, start and set config in one cmd (at least with js-ipfs)
- better docs and jsdocs
- we can now be sure which http-client, ipfs or go-ipfs is being used
- utils functions actually work in the browser now
- works in webworkers now
- simpler and faster overall
- disposable node actually clean themselves in the browser
- better tests
- ...
- support electron
- test in electron

New:
- new method `createController` returns a spawned controller
- createFactory as a second parameter to override options per type


Changes:
- `create` change to `createFactory`
- `createFactory` options changed

Old
```md
- `options` - optional object with:
  - `remote` bool - use remote endpoint to spawn the nodes.
  - `port` number - remote endpoint port. Defaults to 43134.
  - `exec` - IPFS executable path. `ipfsd-ctl` will attempt to locate it by default. If you desire to spawn js-ipfs instances in the same process, pass the ref to the module instead (e.g `exec: require('ipfs')`)
  - `type` - the daemon type, see below the options
    - `go` - spawn go-ipfs daemon
    - `js` - spawn js-ipfs daemon
    - `proc` - spawn in-process js-ipfs instance. Needs to be called also with exec. Example: `DaemonFactory.create({type: 'proc', exec: require('ipfs') })`.
  - `IpfsClient` - A custom IPFS API constructor to use instead of the packaged one
```

**New**
```markdown
-   `remote` [boolean] Use remote endpoint to spawn the nodes. Defaults to `true` when not in node.
-   `test` [test=false] - Flag to activate custom config for tests.
-   `endpoint` [endpoint] - Endpoint URL to manage remote Controllers. (Defaults: 'http://localhost:43134').
-   `disposable` [Boolean] A new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits.
-   `type` [string] The daemon type, see below the options:-   go - spawn go-ipfs daemon
    -   js - spawn js-ipfs daemon
    -   proc - spawn in-process js-ipfs instance
-   `env` [Object] Additional environment variables, passed to executing shell. Only applies for Daemon controllers.
-   `args` [Array] Custom cli args.
-   `ipfsHttp` [Object] Setup IPFS HTTP client to be used by ctl.
    -   `ipfsHttp.ref` [Object] Reference to a IPFS HTTP Client object. (defaults to the local require(`ipfs-http-client`))
    -   `ipfsHttp.path` [string] Path to a IPFS HTTP Client to be required. (defaults to the local require.resolve('ipfs-http-client'))
-   `ipfsApi` [Object] Setup IPFS API to be used by ctl.
    -   `ipfsApi.ref` [Object] Reference to a IPFS API object. (defaults to the local require(`ipfs`))
    -   `ipfsApi.path` [string] Path to a IPFS API implementation to be required. (defaults to the local require.resolve('ipfs'))
-   `ipfsBin` [String] Path to a IPFS exectutable . (defaults to the local 'js-ipfs/src/bin/cli.js')
-   `ipfsOptions` [IpfsOptions] Options for the IPFS instance
```

- Previous default ipfs config is only applied when `test` options equals `true`
- `defaultAddrs` option was removed
- Spawn options are the same as `createFactory`

Old
```
- `options` is an optional object the following properties:
  - `init` bool (default true) or Object - should the node be initialized
  - `initOptions` object - should be of the form `{bits: <size>}`, which sets the desired key size
  - `start` bool (default true) - should the node be started
  - `repoPath` string - the repository path to use for this node, ignored if node is disposable
  - `disposable` bool (default true) - a new repo is created and initialized for each invocation, as well as cleaned up automatically once the process exits
  - `defaultAddrs` bool (default false) - use the daemon default `Swarm` addrs
  - `args` - array of cmd line arguments to be passed to ipfs daemon
  - `config` - ipfs configuration options
```

**NEW**
Same as js-ipfs constructor https://github.com/ipfs/js-ipfs#ipfs-constructor
- ipfsd.killProcess removed not needed anymore
- ipfsd.getConfig removed call ipfsd.api.config.get instead
- ipfsd.setConfig removed, call ipfsd.api.config.set instead

**Read the README for documention on the new api and options**



<a name="0.47.4"></a>
## [0.47.4](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.47.3...v0.47.4) (2019-10-14)


### Bug Fixes

* support more ipfs options ([#396](https://github.com/ipfs/js-ipfsd-ctl/issues/396)) ([2a9706e](https://github.com/ipfs/js-ipfsd-ctl/commit/2a9706e))



<a name="0.47.3"></a>
## [0.47.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.47.2...v0.47.3) (2019-10-10)


### Bug Fixes

* revert multiaddr ([#393](https://github.com/ipfs/js-ipfsd-ctl/issues/393)) ([9faca56](https://github.com/ipfs/js-ipfsd-ctl/commit/9faca56))



<a name="0.47.2"></a>
## [0.47.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.47.1...v0.47.2) (2019-09-20)



<a name="0.47.1"></a>
## [0.47.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.47.0...v0.47.1) (2019-09-18)


### Bug Fixes

* use local options instead of instance to check "exec" ([38a730d](https://github.com/ipfs/js-ipfsd-ctl/commit/38a730d))



<a name="0.47.0"></a>
# [0.47.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.46.3...v0.47.0) (2019-09-18)


### Bug Fixes

* fix non-disposable and normalises behaviour ([#379](https://github.com/ipfs/js-ipfsd-ctl/issues/379)) ([b502bd4](https://github.com/ipfs/js-ipfsd-ctl/commit/b502bd4)), closes [#305](https://github.com/ipfs/js-ipfsd-ctl/issues/305) [#276](https://github.com/ipfs/js-ipfsd-ctl/issues/276) [#354](https://github.com/ipfs/js-ipfsd-ctl/issues/354) [#330](https://github.com/ipfs/js-ipfsd-ctl/issues/330) [#329](https://github.com/ipfs/js-ipfsd-ctl/issues/329)



<a name="0.46.3"></a>
## [0.46.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.46.2...v0.46.3) (2019-09-15)



<a name="0.46.2"></a>
## [0.46.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.46.1...v0.46.2) (2019-09-15)


### Bug Fixes

* fix electron ([#375](https://github.com/ipfs/js-ipfsd-ctl/issues/375)) ([6be5027](https://github.com/ipfs/js-ipfsd-ctl/commit/6be5027))



<a name="0.46.1"></a>
## [0.46.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.46.0...v0.46.1) (2019-09-11)


### Bug Fixes

* make proc silent by default ([a62bd97](https://github.com/ipfs/js-ipfsd-ctl/commit/a62bd97))



<a name="0.46.0"></a>
# [0.46.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.45.1...v0.46.0) (2019-09-05)


### Features

* remove pubsub flags ([#366](https://github.com/ipfs/js-ipfsd-ctl/issues/366)) ([3d4b943](https://github.com/ipfs/js-ipfsd-ctl/commit/3d4b943))


### BREAKING CHANGES

* pubsub flags for in-proc daemons will not set values anymore



<a name="0.45.1"></a>
## [0.45.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.45.0...v0.45.1) (2019-09-03)



<a name="0.45.0"></a>
# [0.45.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.44.2...v0.45.0) (2019-09-02)


### Features

* pubsub flag defaults ([#363](https://github.com/ipfs/js-ipfsd-ctl/issues/363)) ([6958239](https://github.com/ipfs/js-ipfsd-ctl/commit/6958239))


### BREAKING CHANGES

* removes the experimental flag of pubsub and makes it enable by default



<a name="0.44.2"></a>
## [0.44.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.44.1...v0.44.2) (2019-08-30)



<a name="0.44.1"></a>
## [0.44.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.44.0...v0.44.1) (2019-07-11)



<a name="0.44.0"></a>
# [0.44.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.43.0...v0.44.0) (2019-07-05)


### Features

* refactor to async/await ([#353](https://github.com/ipfs/js-ipfsd-ctl/issues/353)) ([ab1a2a4](https://github.com/ipfs/js-ipfsd-ctl/commit/ab1a2a4))



<a name="0.43.0"></a>
# [0.43.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.42.4...v0.43.0) (2019-06-20)


### Bug Fixes

* updates deps and http for name resolve dns ([#332](https://github.com/ipfs/js-ipfsd-ctl/issues/332)) ([58a9fea](https://github.com/ipfs/js-ipfsd-ctl/commit/58a9fea))



<a name="0.42.4"></a>
## [0.42.4](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.42.3...v0.42.4) (2019-06-04)



<a name="0.42.3"></a>
## [0.42.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.42.2...v0.42.3) (2019-05-17)


### Bug Fixes

* dont call callbacks twice ([c61606f](https://github.com/ipfs/js-ipfsd-ctl/commit/c61606f))



<a name="0.42.2"></a>
## [0.42.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.42.1...v0.42.2) (2019-04-04)


### Bug Fixes

* pass relay in via opts, not config ([#327](https://github.com/ipfs/js-ipfsd-ctl/issues/327)) ([bc0a5b8](https://github.com/ipfs/js-ipfsd-ctl/commit/bc0a5b8))



<a name="0.42.1"></a>
## [0.42.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.42.0...v0.42.1) (2019-03-20)


### Bug Fixes

* remove relay and mfs from experimental ([#325](https://github.com/ipfs/js-ipfsd-ctl/issues/325)) ([c42c960](https://github.com/ipfs/js-ipfsd-ctl/commit/c42c960))


### Features

* add bundlesize check ([#323](https://github.com/ipfs/js-ipfsd-ctl/issues/323)) ([fc5cef8](https://github.com/ipfs/js-ipfsd-ctl/commit/fc5cef8))



<a name="0.42.0"></a>
# [0.42.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.41.0...v0.42.0) (2019-02-12)


### Features

* support passing profile init option ([#321](https://github.com/ipfs/js-ipfsd-ctl/issues/321)) ([62a15d2](https://github.com/ipfs/js-ipfsd-ctl/commit/62a15d2))



<a name="0.41.0"></a>
# [0.41.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.40.3...v0.41.0) (2019-01-30)


### Bug Fixes

* rename local flag to offline ([#318](https://github.com/ipfs/js-ipfsd-ctl/issues/318)) ([49bf51b](https://github.com/ipfs/js-ipfsd-ctl/commit/49bf51b))


### BREAKING CHANGES

* `--local` option has been renamed to `--offline`



<a name="0.40.3"></a>
## [0.40.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.40.2...v0.40.3) (2019-01-04)



<a name="0.40.2"></a>
## [0.40.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.40.1...v0.40.2) (2018-12-11)



<a name="0.40.1"></a>
## [0.40.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.40.0...v0.40.1) (2018-11-28)


### Features

* add gitlab ci ([#310](https://github.com/ipfs/js-ipfsd-ctl/issues/310)) ([7df2805](https://github.com/ipfs/js-ipfsd-ctl/commit/7df2805))
* change to ipfs-http-client ([#311](https://github.com/ipfs/js-ipfsd-ctl/issues/311)) ([412c18f](https://github.com/ipfs/js-ipfsd-ctl/commit/412c18f))



<a name="0.40.0"></a>
# [0.40.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.39.5...v0.40.0) (2018-11-03)


### Features

* go-ipfs 0.4.18 and js-ipfs 0.33.0 ([503ef42](https://github.com/ipfs/js-ipfsd-ctl/commit/503ef42))



<a name="0.39.5"></a>
## [0.39.5](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.39.4...v0.39.5) (2018-10-28)


### Bug Fixes

* linting errors ([ac22a3c](https://github.com/ipfs/js-ipfsd-ctl/commit/ac22a3c))


### Features

* add dht experimental flag ([3164a88](https://github.com/ipfs/js-ipfsd-ctl/commit/3164a88))
* use execa instead of subcomandante ([388b401](https://github.com/ipfs/js-ipfsd-ctl/commit/388b401))



<a name="0.39.4"></a>
## [0.39.4](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.39.3...v0.39.4) (2018-10-26)


### Bug Fixes

* upgrade ipfs-api ([3c8c913](https://github.com/ipfs/js-ipfsd-ctl/commit/3c8c913))



<a name="0.39.3"></a>
## [0.39.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.39.2...v0.39.3) (2018-10-19)


### Bug Fixes

* CLI scraping of API and Gateway addresses ([#301](https://github.com/ipfs/js-ipfsd-ctl/issues/301)) ([1fc3fa0](https://github.com/ipfs/js-ipfsd-ctl/commit/1fc3fa0))


### Features

* upgrade to ipfs-api 24.0.1 ([d773a27](https://github.com/ipfs/js-ipfsd-ctl/commit/d773a27))
* Use pregenerated ids for testing ([#284](https://github.com/ipfs/js-ipfsd-ctl/issues/284)) ([cbc1ac6](https://github.com/ipfs/js-ipfsd-ctl/commit/cbc1ac6))



<a name="0.39.2"></a>
## [0.39.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.39.1...v0.39.2) (2018-09-12)


### Bug Fixes

* add namesys pubsub option ([#293](https://github.com/ipfs/js-ipfsd-ctl/issues/293)) ([d1f23a3](https://github.com/ipfs/js-ipfsd-ctl/commit/d1f23a3))
* fix ipfsd.init return value ([#291](https://github.com/ipfs/js-ipfsd-ctl/issues/291)) ([3fa63e3](https://github.com/ipfs/js-ipfsd-ctl/commit/3fa63e3)), closes [#289](https://github.com/ipfs/js-ipfsd-ctl/issues/289)



<a name="0.39.1"></a>
## [0.39.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.37.5...v0.39.1) (2018-08-07)


### Features

* allows a custom IpfsApi constructor to be used ([#261](https://github.com/ipfs/js-ipfsd-ctl/issues/261)) ([dacde26](https://github.com/ipfs/js-ipfsd-ctl/commit/dacde26))
* go-ipfs 0.4.17 ([958a9e3](https://github.com/ipfs/js-ipfsd-ctl/commit/958a9e3))



<a name="0.39.0"></a>
# [0.39.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.38.0...v0.39.0) (2018-07-28)


### Features

* go-ipfs 0.4.17 ([958a9e3](https://github.com/ipfs/js-ipfsd-ctl/commit/958a9e3))



<a name="0.38.0"></a>
# [0.38.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.37.5...v0.38.0) (2018-07-15)



<a name="0.37.5"></a>
## [0.37.5](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.37.4...v0.37.5) (2018-06-22)


### Bug Fixes

* pass config to ipfs for proc daemon ([#268](https://github.com/ipfs/js-ipfsd-ctl/issues/268)) ([1cdb739](https://github.com/ipfs/js-ipfsd-ctl/commit/1cdb739))


### Features

* log stderr from daemon ([#270](https://github.com/ipfs/js-ipfsd-ctl/issues/270)) ([c4a175c](https://github.com/ipfs/js-ipfsd-ctl/commit/c4a175c))



<a name="0.37.4"></a>
## [0.37.4](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.37.3...v0.37.4) (2018-06-11)


### Features

* add timeout to stop and killProcess ([#228](https://github.com/ipfs/js-ipfsd-ctl/issues/228)) ([d6955d4](https://github.com/ipfs/js-ipfsd-ctl/commit/d6955d4))



<a name="0.37.3"></a>
## [0.37.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.37.2...v0.37.3) (2018-06-01)



<a name="0.37.2"></a>
## [0.37.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.37.1...v0.37.2) (2018-06-01)



<a name="0.37.1"></a>
## [0.37.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.37.0...v0.37.1) (2018-06-01)


### Features

* add support for experimental mfs flag ([3ce834e](https://github.com/ipfs/js-ipfsd-ctl/commit/3ce834e))



<a name="0.37.0"></a>
# [0.37.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.36.0...v0.37.0) (2018-05-23)



<a name="0.36.0"></a>
# [0.36.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.35.0...v0.36.0) (2018-05-17)


### Features

* use go-ipfs 0.4.15 ([4bd2535](https://github.com/ipfs/js-ipfsd-ctl/commit/4bd2535))



<a name="0.35.0"></a>
# [0.35.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.34.0...v0.35.0) (2018-05-17)


### Features

* stop using ipfs-repo ([ca44996](https://github.com/ipfs/js-ipfsd-ctl/commit/ca44996))



<a name="0.34.0"></a>
# [0.34.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.33.2...v0.34.0) (2018-05-14)



<a name="0.33.2"></a>
## [0.33.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.33.1...v0.33.2) (2018-05-08)



<a name="0.33.1"></a>
## [0.33.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.33.0...v0.33.1) (2018-05-06)


### Bug Fixes

* Daemon spawning throws error with the new multiaddr version ([a0d2e37](https://github.com/ipfs/js-ipfsd-ctl/commit/a0d2e37))



<a name="0.33.0"></a>
# [0.33.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.32.1...v0.33.0) (2018-05-04)


### Bug Fixes

* error event propagation ([#233](https://github.com/ipfs/js-ipfsd-ctl/issues/233)) ([db3dd68](https://github.com/ipfs/js-ipfsd-ctl/commit/db3dd68))



<a name="0.32.1"></a>
## [0.32.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.32.0...v0.32.1) (2018-04-12)



<a name="0.32.0"></a>
# [0.32.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.31.0...v0.32.0) (2018-04-06)


### Features

* use default daemon addrs ([#220](https://github.com/ipfs/js-ipfsd-ctl/issues/220)) ([510b320](https://github.com/ipfs/js-ipfsd-ctl/commit/510b320))



<a name="0.31.0"></a>
# [0.31.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.30.4...v0.31.0) (2018-03-27)


### Features

* upgrade to go-ipfs-0.4.14 ([77b4cd9](https://github.com/ipfs/js-ipfsd-ctl/commit/77b4cd9))



<a name="0.30.4"></a>
## [0.30.4](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.30.3...v0.30.4) (2018-03-21)


### Features

* add ability to use go and js env exec ([#219](https://github.com/ipfs/js-ipfsd-ctl/issues/219)) ([4c8fcad](https://github.com/ipfs/js-ipfsd-ctl/commit/4c8fcad)), closes [#221](https://github.com/ipfs/js-ipfsd-ctl/issues/221)
* detect running node ([#221](https://github.com/ipfs/js-ipfsd-ctl/issues/221)) ([26c2634](https://github.com/ipfs/js-ipfsd-ctl/commit/26c2634))



<a name="0.30.3"></a>
## [0.30.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.30.2...v0.30.3) (2018-03-16)


### Bug Fixes

* daemon should recognize previously created repos. ([#212](https://github.com/ipfs/js-ipfsd-ctl/issues/212)) ([2e9cf0d](https://github.com/ipfs/js-ipfsd-ctl/commit/2e9cf0d))



<a name="0.30.2"></a>
## [0.30.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.30.1...v0.30.2) (2018-03-16)


### Bug Fixes

* pass on environment variables ([b73325e](https://github.com/ipfs/js-ipfsd-ctl/commit/b73325e))



<a name="0.30.1"></a>
## [0.30.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.30.0...v0.30.1) (2018-03-15)


### Bug Fixes

* pass keysize on command line ([e2a6697](https://github.com/ipfs/js-ipfsd-ctl/commit/e2a6697))



<a name="0.30.0"></a>
# [0.30.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.29.1...v0.30.0) (2018-03-14)


### Features

* graceful stop, fix stop for Windows ([#205](https://github.com/ipfs/js-ipfsd-ctl/issues/205)) ([359dd62](https://github.com/ipfs/js-ipfsd-ctl/commit/359dd62))



<a name="0.29.1"></a>
## [0.29.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.29.0...v0.29.1) (2018-02-23)


### Bug Fixes

* pick a non used port ([4fdb071](https://github.com/ipfs/js-ipfsd-ctl/commit/4fdb071))



<a name="0.29.0"></a>
# [0.29.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.28.0...v0.29.0) (2018-02-21)


### Bug Fixes

* don't pass on arguments from node executable ([cf794cd](https://github.com/ipfs/js-ipfsd-ctl/commit/cf794cd)), closes [#202](https://github.com/ipfs/js-ipfsd-ctl/issues/202)


### Features

* add keysize through an option to spawn ([#203](https://github.com/ipfs/js-ipfsd-ctl/issues/203)) ([151303c](https://github.com/ipfs/js-ipfsd-ctl/commit/151303c))



<a name="0.28.0"></a>
# [0.28.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.27.3...v0.28.0) (2018-02-12)


### Bug Fixes

* make sure repo is being properly cleaned up ([#196](https://github.com/ipfs/js-ipfsd-ctl/issues/196)) ([4e8b8db](https://github.com/ipfs/js-ipfsd-ctl/commit/4e8b8db))


### Features

* add logging for debug ([#195](https://github.com/ipfs/js-ipfsd-ctl/issues/195)) ([86b0ab0](https://github.com/ipfs/js-ipfsd-ctl/commit/86b0ab0))
* the big refactor! ([#200](https://github.com/ipfs/js-ipfsd-ctl/issues/200)) ([adbef1b](https://github.com/ipfs/js-ipfsd-ctl/commit/adbef1b))



<a name="0.27.3"></a>
## [0.27.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.27.2...v0.27.3) (2018-01-30)


### Features

* add passphrase to init options ([#197](https://github.com/ipfs/js-ipfsd-ctl/issues/197)) ([7cf6384](https://github.com/ipfs/js-ipfsd-ctl/commit/7cf6384))



<a name="0.27.2"></a>
## [0.27.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.27.1...v0.27.2) (2018-01-27)


### Features

* support for passphrase for js-ipfs daemons ([3bc94c1](https://github.com/ipfs/js-ipfsd-ctl/commit/3bc94c1))



<a name="0.27.1"></a>
## [0.27.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.27.0...v0.27.1) (2018-01-21)


### Bug Fixes

* make sure exec matches the passed node type ([#184](https://github.com/ipfs/js-ipfsd-ctl/issues/184)) ([89e9059](https://github.com/ipfs/js-ipfsd-ctl/commit/89e9059))



<a name="0.27.0"></a>
# [0.27.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.26.1...v0.27.0) (2018-01-16)



<a name="0.26.1"></a>
## [0.26.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.26.0...v0.26.1) (2018-01-16)


### Features

* Complete revamp! Spawn js/go daemons locally or remote (from the browser) ([#176](https://github.com/ipfs/js-ipfsd-ctl/issues/176)) ([1cfbd08](https://github.com/ipfs/js-ipfsd-ctl/commit/1cfbd08))



<a name="0.26.0"></a>
# [0.26.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.25.1...v0.26.0) (2017-12-01)



<a name="0.25.1"></a>
## [0.25.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.25.0...v0.25.1) (2017-11-22)


### Features

* accept flags as an object as well ([8cb9d01](https://github.com/ipfs/js-ipfsd-ctl/commit/8cb9d01))



<a name="0.25.0"></a>
# [0.25.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.24.1...v0.25.0) (2017-11-22)



<a name="0.24.1"></a>
## [0.24.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.24.0...v0.24.1) (2017-11-12)


### Features

* more windows interop ([#171](https://github.com/ipfs/js-ipfsd-ctl/issues/171)) ([0561798](https://github.com/ipfs/js-ipfsd-ctl/commit/0561798))



<a name="0.24.0"></a>
# [0.24.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.23.0...v0.24.0) (2017-10-18)



<a name="0.23.0"></a>
# [0.23.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.22.0...v0.23.0) (2017-09-06)


### Features

* replaces path to .asar.unpacked + windows support ([a44cb79](https://github.com/ipfs/js-ipfsd-ctl/commit/a44cb79))
* Slay the Dragon! ([#165](https://github.com/ipfs/js-ipfsd-ctl/issues/165)) ([80377cd](https://github.com/ipfs/js-ipfsd-ctl/commit/80377cd))



<a name="0.22.0"></a>
# [0.22.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.21.0...v0.22.0) (2017-09-02)


### Bug Fixes

* show whole config ([#153](https://github.com/ipfs/js-ipfsd-ctl/issues/153)) ([e5a8eb5](https://github.com/ipfs/js-ipfsd-ctl/commit/e5a8eb5))


### Features

* use go-ipfs 0.4.10 ([b0286fb](https://github.com/ipfs/js-ipfsd-ctl/commit/b0286fb))



<a name="0.21.0"></a>
# [0.21.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.20.0...v0.21.0) (2017-05-19)


### Bug Fixes

* remove possible overlapping of tmp folder ([54a96a8](https://github.com/ipfs/js-ipfsd-ctl/commit/54a96a8))


### Features

* update to use go-ipfs v0.4.9 and latest ipfs-block ([94f0a97](https://github.com/ipfs/js-ipfsd-ctl/commit/94f0a97))



<a name="0.20.0"></a>
# [0.20.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.19.0...v0.20.0) (2017-03-20)


### Features

* v0.4.7 and update aegir and its lintness ([eadf560](https://github.com/ipfs/js-ipfsd-ctl/commit/eadf560))



<a name="0.19.0"></a>
# [0.19.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.18.3...v0.19.0) (2017-02-16)



<a name="0.18.3"></a>
## [0.18.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.18.2...v0.18.3) (2017-02-09)



<a name="0.18.2"></a>
## [0.18.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.18.1...v0.18.2) (2017-01-31)



<a name="0.18.1"></a>
## [0.18.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.18.0...v0.18.1) (2017-01-04)


### Bug Fixes

* drop is-running to 1.0.5 ([#144](https://github.com/ipfs/js-ipfsd-ctl/issues/144)) ([6e98edb](https://github.com/ipfs/js-ipfsd-ctl/commit/6e98edb))



<a name="0.18.0"></a>
# [0.18.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.17.0...v0.18.0) (2016-12-23)


### Bug Fixes

* fail gracefully when config file is not found ([a200a15](https://github.com/ipfs/js-ipfsd-ctl/commit/a200a15))


### Features

* **init:** Add the possibility to pass options to init() ([9c48373](https://github.com/ipfs/js-ipfsd-ctl/commit/9c48373))
* better stream handling ([#140](https://github.com/ipfs/js-ipfsd-ctl/issues/140)) ([a0adc82](https://github.com/ipfs/js-ipfsd-ctl/commit/a0adc82))



<a name="0.17.0"></a>
# [0.17.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.16.0...v0.17.0) (2016-10-29)



<a name="0.16.0"></a>
# [0.16.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.15.0...v0.16.0) (2016-09-29)


### Bug Fixes

* ensure setting the config cbs only once ([e44a8ac](https://github.com/ipfs/js-ipfsd-ctl/commit/e44a8ac))


### Features

* upgrade to go-ipfs 0.4.3 ([a2ebc1a](https://github.com/ipfs/js-ipfsd-ctl/commit/a2ebc1a))



<a name="0.15.0"></a>
# [0.15.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.14.0...v0.15.0) (2016-09-16)


### Bug Fixes

* **shutdown:** fixed bugs in stopDaemon ([af21eb0](https://github.com/ipfs/js-ipfsd-ctl/commit/af21eb0))
* **startDaemon:** fix the behavior of startDeamon ([0deb7e5](https://github.com/ipfs/js-ipfsd-ctl/commit/0deb7e5))
* **test:** change hash of src test ([349a44c](https://github.com/ipfs/js-ipfsd-ctl/commit/349a44c))
* make the linter happy for D# ([9a5c0e2](https://github.com/ipfs/js-ipfsd-ctl/commit/9a5c0e2))
* rm unused var (thanks, linter) ([6d21086](https://github.com/ipfs/js-ipfsd-ctl/commit/6d21086))
* **tests:** guarded func to avoid it being called twice ([2c8a3c1](https://github.com/ipfs/js-ipfsd-ctl/commit/2c8a3c1))


### Features

* **startDeamon:** allow passing flags to ipfs daemon ([c7ea808](https://github.com/ipfs/js-ipfsd-ctl/commit/c7ea808))



<a name="0.14.0"></a>
# [0.14.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.13.0...v0.14.0) (2016-05-18)


### Features

* upgrade dependencies to latest ([0231951](https://github.com/ipfs/js-ipfsd-ctl/commit/0231951))



<a name="0.13.0"></a>
# [0.13.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.12.0...v0.13.0) (2016-05-01)



<a name="0.12.0"></a>
# [0.12.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.11.0...v0.12.0) (2016-04-27)



<a name="0.11.0"></a>
# [0.11.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.10.1...v0.11.0) (2016-04-22)



<a name="0.10.1"></a>
## [0.10.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.10.0...v0.10.1) (2016-04-11)



<a name="0.10.0"></a>
# [0.10.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.9.1...v0.10.0) (2016-04-09)



<a name="0.9.1"></a>
## [0.9.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.9.0...v0.9.1) (2016-04-08)



<a name="0.9.0"></a>
# [0.9.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.8.1...v0.9.0) (2016-04-08)



<a name="0.8.1"></a>
## [0.8.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.8.0...v0.8.1) (2016-01-31)



<a name="0.8.0"></a>
# [0.8.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.7.1...v0.8.0) (2016-01-22)


### Features

* Upgrade to ipfs@0.3.11 ([fc8bbef](https://github.com/ipfs/js-ipfsd-ctl/commit/fc8bbef))



<a name="0.7.1"></a>
## [0.7.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.6.3...v0.7.1) (2015-12-18)



<a name="0.6.3"></a>
## [0.6.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.6.2...v0.6.3) (2015-11-14)



<a name="0.6.2"></a>
## [0.6.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.6.1...v0.6.2) (2015-11-14)


### Features

* Add configurable $IPFS_EXEC ([5aa011b](https://github.com/ipfs/js-ipfsd-ctl/commit/5aa011b))
* Require node.js >= 4 ([f25143b](https://github.com/ipfs/js-ipfsd-ctl/commit/f25143b))



<a name="0.6.1"></a>
## [0.6.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.6.0...v0.6.1) (2015-11-02)


### Bug Fixes

* Switch shutdown handler library ([491268b](https://github.com/ipfs/js-ipfsd-ctl/commit/491268b)), closes [#19](https://github.com/ipfs/js-ipfsd-ctl/issues/19)



<a name="0.6.0"></a>
# [0.6.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.5.6...v0.6.0) (2015-10-31)



<a name="0.5.6"></a>
## [0.5.6](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.5.5...v0.5.6) (2015-10-29)



<a name="0.5.5"></a>
## [0.5.5](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.5.4...v0.5.5) (2015-10-24)



<a name="0.5.4"></a>
## [0.5.4](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.5.3...v0.5.4) (2015-10-16)



<a name="0.5.3"></a>
## [0.5.3](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.5.2...v0.5.3) (2015-10-16)



<a name="0.5.2"></a>
## [0.5.2](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.5.1...v0.5.2) (2015-10-11)



<a name="0.5.1"></a>
## [0.5.1](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.5.0...v0.5.1) (2015-09-25)



<a name="0.5.0"></a>
# [0.5.0](https://github.com/ipfs/js-ipfsd-ctl/compare/v0.4.1...v0.5.0) (2015-09-18)



<a name="0.4.1"></a>
## 0.4.1 (2015-09-18)



