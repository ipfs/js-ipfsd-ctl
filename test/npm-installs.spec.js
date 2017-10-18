/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const fs = require('fs')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const path = require('path')

describe('ipfs executable path', () => {
  it('has the correct path when installed with npm3', (done) => {
    process.env.testpath = '/tmp/ipfsd-ctl-test/node_modules/ipfsd-ctl/lib' // fake __dirname
    let npm3Path = '/tmp/ipfsd-ctl-test/node_modules/go-ipfs-dep/go-ipfs'

    mkdirp(npm3Path, (err) => {
      expect(err).to.not.exist()

      fs.writeFileSync(path.join(npm3Path, 'ipfs'))
      delete require.cache[require.resolve('../src/daemon.js')]
      const Daemon = require('../src/daemon.js')

      const node = new Daemon()
      expect(node.exec)
        .to.eql(path.normalize('/tmp/ipfsd-ctl-test/node_modules/go-ipfs-dep/go-ipfs/ipfs'))
      rimraf('/tmp/ipfsd-ctl-test', done)
    })
  })

  it('has the correct path when installed with npm2', (done) => {
    process.env.testpath = '/tmp/ipfsd-ctl-test/node_modules/ipfsd-ctl/lib' // fake __dirname

    let npm2Path = '/tmp/ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/go-ipfs-dep/go-ipfs'

    mkdirp(npm2Path, (err) => {
      expect(err).to.not.exist()

      fs.writeFileSync(path.join(npm2Path, 'ipfs'))
      delete require.cache[require.resolve('../src/daemon.js')]
      const Daemon = require('../src/daemon.js')

      const node = new Daemon()

      expect(node.exec)
        .to.eql(
        path.normalize('/tmp/ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/go-ipfs-dep/go-ipfs/ipfs')
      )
      rimraf('/tmp/ipfsd-ctl-test', done)
    })
  })
})
