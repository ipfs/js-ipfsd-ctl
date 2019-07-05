/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const isWindows = os.platform() === 'win32'

const types = [
  'js',
  'go'
]

types.forEach((type) => {
  describe('ipfs executable path', () => {
    let tmp
    let appName
    let oldPath

    before(() => {
      tmp = os.tmpdir()

      appName = type === 'js'
        ? 'bin.js'
        : isWindows ? 'ipfs.exe' : 'ipfs'

      oldPath = process.env.testpath

      // fake __dirname
      process.env.testpath = path.join(tmp, 'ipfsd-ctl-test/node_modules/ipfsd-ctl/lib')
    })

    after(() => {
      process.env.testpath = oldPath
    })

    it('has the correct path when installed with npm3', async () => {
      let execPath = type === 'js'
        ? 'ipfsd-ctl-test/node_modules/ipfs/src/cli'
        : 'ipfsd-ctl-test/node_modules/go-ipfs-dep/go-ipfs'

      let npm3Path = path.join(tmp, execPath)

      await fs.mkdirp(npm3Path)
      fs.writeFileSync(path.join(npm3Path, appName))

      delete require.cache[require.resolve('../src/ipfsd-daemon.js')]
      const Daemon = require('../src/ipfsd-daemon.js')

      const node = new Daemon({ type })
      expect(node.exec)
        .to.eql(path.join(tmp, `${execPath}/${appName}`))

      await fs.remove(path.join(tmp, 'ipfsd-ctl-test'))
    })

    it('has the correct path when installed with npm2', async () => {
      const execPath = type === 'js'
        ? 'ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/ipfs/src/cli'
        : 'ipfsd-ctl-test/node_modules/ipfsd-ctl/node_modules/go-ipfs-dep/go-ipfs'

      const npm2Path = path.join(tmp, execPath)

      await fs.mkdirp(npm2Path)
      fs.writeFileSync(path.join(npm2Path, appName))

      delete require.cache[require.resolve('../src/ipfsd-daemon.js')]
      const Daemon = require('../src/ipfsd-daemon.js')

      const node = new Daemon({ type })
      expect(node.exec)
        .to.eql(path.join(tmp, `${execPath}/${appName}`))

      await fs.remove(path.join(tmp, 'ipfsd-ctl-test'))
    })
  })
})
