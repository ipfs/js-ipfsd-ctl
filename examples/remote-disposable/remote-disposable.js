/* eslint no-console: 0 */
// @ts-check
// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const { path } = require('kubo')
const { create } = require('kubo-rpc-client')
/**
 * @type {import('../../src')}
 */
const { createNode, createServer } = require('../../src')
const server = createServer()

async function run () {
  await server.start()
  const node = await createNode({
    remote: true,
    type: 'kubo',
    bin: path(),
    rpc: create
  })

  console.log(await node.api.id())
  await node.stop()
  await server.stop()
}

run()
