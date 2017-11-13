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
const os = require('os')
const isWindows = os.platform() === 'win32'

describe('ipfs executable path', () => {
  const tmp = os.tmpdir()
  const appName = isWindows ? 'ipfs.exe' : 'ipfs'

  const oldPath = process.env.testpath
  before(() => { process.env.testpath = path.join(tmp, 'ipfsd-ctl-test/node_modules/ipfsd-ctl/lib') }) // fake __dirname
  after(() => { process.env.testpath = oldPath })

  it('has the correct path when installed with npm3', (done) => {
    let npm3Path = path.join(tmp, 'ipfsd-ctl-test/node_modules/go-ipfs-dep/go-ipfs')

    mkdirp(npm3Path, (err) => {
      expect(err).to.not.exist()

      fs.writeFileSync(path.join(npm3Path, appName))
      delete require.cache[require.resolve('../src/daemon.js')]
      const Daemon = require('../src/daemon.js')

      const node = new Daemon()
      expect(node.exec)
        .to.eql(path.join(tmp, `ipfsd-ctl-test/node_modules/go-ipfs-dep/go-ipfs/${appName}`))
      rimraf(path.join(tmp, 'ipfsd-ctl-test'), done)
    })
  })

  it('has the correct path when installed with npm2', (done) => {
    let npm2Path = path.join(tmp, 'ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/go-ipfs-dep/go-ipfs')

    mkdirp(npm2Path, (err) => {
      expect(err).to.not.exist()

      fs.writeFileSync(path.join(npm2Path, appName))
      delete require.cache[require.resolve('../src/daemon.js')]
      const Daemon = require('../src/daemon.js')

      const node = new Daemon()

      expect(node.exec)
        .to.eql(path.join(tmp, `ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/go-ipfs-dep/go-ipfs/${appName}`))
      rimraf(path.join(tmp, 'ipfsd-ctl-test'), done)
    })
  })
})
