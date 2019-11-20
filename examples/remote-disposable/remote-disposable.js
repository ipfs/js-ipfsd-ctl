/* eslint no-console: 0 */
'use strict'

// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const { createNode, createServer } = require('../../src')
const server = createServer()

async function run () {
  await server.start()
  const node = await createNode({ remote: true })

  console.log(await node.api.id())
  await node.stop()
  await server.stop()
}

run()
