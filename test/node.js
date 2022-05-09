/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { createFactory } from '../src/index.js'
import * as ipfsModule from 'ipfs'
import * as ipfsHttpModule from 'ipfs-http-client'
// @ts-ignore no types
import * as goIpfsModule from 'go-ipfs'

import './node.routes.js'
import './node.utils.js'

describe('Node specific tests', async function () {
  this.timeout(60000)

  const factory = createFactory({
    test: true,
    ipfsHttpModule,
    ipfsModule,
    ipfsBin: goIpfsModule.path()
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
