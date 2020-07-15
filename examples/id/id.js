/* eslint no-console: 0 */
'use strict'

const { createController } = require('../../src')

async function run () {
  const node = await createController({
    type: 'go',
    ipfsBin: require('go-ipfs').path(),
    ipfsHttpModule: require('ipfs-http-client')
  })
  console.log('alice')
  console.log(await node.api.id())
  await node.stop()

  const nodeJs = await createController({
    type: 'js',
    ipfsBin: require.resolve('ipfs/src/cli/bin.js'),
    ipfsHttpModule: require('ipfs-http-client')
  })
  console.log('alice')
  console.log(await nodeJs.api.id())
  await nodeJs.stop()

  const nodeProc = await createController({
    type: 'proc',
    ipfsModule: require('ipfs'),
    ipfsHttpModule: require('ipfs-http-client')
  })
  console.log('bob')
  console.log(await nodeProc.api.id())
  await nodeProc.stop()
  process.exit()
}

run()
