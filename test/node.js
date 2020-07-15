/* eslint-env mocha */

'use strict'

const { expect } = require('aegir/utils/chai')
const { createFactory } = require('../src')

describe('Node specific tests', function () {
  this.timeout(60000)

  const factory = createFactory({
    test: true,
    ipfsHttpModule: require('ipfs-http-client'),
    ipfsModule: require('ipfs'),
    ipfsBin: require('go-ipfs').path()
  })

  it('should use process.IPFS_PATH', async () => {
    const repoPath = await factory.tmpDir()
    process.env.IPFS_PATH = repoPath
    const ctl = await factory.spawn({
      type: 'go',
      disposable: false,
      ipfsOptions: {
        init: false,
        start: false
      }
    })

    expect(ctl.path).to.equal(repoPath)
    delete process.env.IPFS_PATH
  })
})

require('./node.routes')
require('./node.utils')
