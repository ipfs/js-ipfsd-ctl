/* eslint-env mocha */
'use strict'

const config = require('../src/config')
const expect = require('chai').expect
const fs = require('fs')
const rimraf = require('rimraf')
const join = require('path').join
const Binary = require('../src/binary')

describe('external ipfs binary', function () {
  this.timeout(30000)

  it('allows passing via $IPFS_EXEC', (done) => {
    process.env.IPFS_EXEC = '/some/path'
    const binary = Binary()
    expect(binary.path()).to.be.equal('/some/path/ipfs')
    expect(binary.checked).to.be.false

    process.env.IPFS_EXEC = ''
    done()
  })

  it('allows path to be set through function argument', (done) => {
    const binary = Binary('/some/path2')
    expect(binary.path()).to.be.equal('/some/path2/ipfs')
    expect(binary.checked).to.be.false

    done()
  })

  it('the binary download works accordingly to the default path', (done) => {
    const execPath = join(config.defaultExecPath, 'ipfs')
    // Remove default exec dir at start, if any
    rimraf.sync(config.defaultExecPath)
    expect(fs.existsSync(execPath)).to.be.false
    const binary = Binary()
    expect(binary.path()).to.be.equal(execPath)
    expect(binary.checked).to.be.false

    binary.check((err) => {
      if (err) throw err
      expect(fs.existsSync(execPath)).to.be.true
      expect(binary.checked).to.be.true
      done()
    })
  })
})
