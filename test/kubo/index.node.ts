/* eslint-env mocha */

import { join } from 'node:path'
import { expect } from 'aegir/chai'
import getPort from 'aegir/get-port'
import kubo from 'kubo'
import { create as createKuboRPCClient } from 'kubo-rpc-client'
import { createNode, type KuboNode } from '../../src/index.js'
import { tmpdir } from 'node:os'

describe('index', () => {
  let node: KuboNode

  afterEach(async () => {
    if (node != null) {
      await node.stop()
    }
  })

  it('should allow overriding config when repo already exists', async () => {
    const expectedPort1 = await getPort(8088)
    const expectedPort2 = await getPort(8089)
    const repo = join(tmpdir(), 'ipfs-test-repo')
    node = await createNode({
      repo,
      disposable: false,
      type: 'kubo',
      rpc: createKuboRPCClient,
      bin: kubo.path(),
      init: {
        config: {
          Addresses: {
            Gateway: `/ip4/127.0.0.1/tcp/${expectedPort1}`
          }
        }
      }
    })

    const info = await node.info()
    expect(info.gateway).to.equal(`http://127.0.0.1:${expectedPort1}`)

    await node.stop()

    node = await createNode({
      repo,
      disposable: true, // cleanup the repo when this one is disposed.
      type: 'kubo',
      rpc: createKuboRPCClient,
      bin: kubo.path(),
      init: {
        config: {
          Addresses: {
            Gateway: `/ip4/127.0.0.1/tcp/${expectedPort2}`
          }
        }
      }
    })

    const info2 = await node.info()
    expect(info2.gateway).to.equal(`http://127.0.0.1:${expectedPort2}`)
  })
})
