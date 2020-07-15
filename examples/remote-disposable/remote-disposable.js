/* eslint no-console: 0 */
'use strict'

// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const { createController, createServer } = require('../../src')
const server = createServer()

async function run () {
  await server.start()
  const node = await createController({
    remote: true,
    type: 'go',
    ipfsBin: require('go-ipfs').path()
  })

  console.log(await node.api.id())
  await node.stop()
  await server.stop()
}

run()
