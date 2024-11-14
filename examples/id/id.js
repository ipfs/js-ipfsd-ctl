/* eslint no-console: 0 */
const { path } = require('kubo')
const { create } = require('kubo-rpc-client')
/**
 * @type {import('../../src')}
 */
const { createNode } = require('../../src')

async function run () {
  const node = await createNode({
    type: 'kubo',
    rpc: create,
    bin: path()
  })
  console.log('alice')
  console.log(await node.api.id())
  await node.stop()
  process.exit()
}

run()
