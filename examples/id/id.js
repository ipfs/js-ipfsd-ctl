/* eslint no-console: 0 */
'use strict'

const { createNode } = require('../../src')

async function run () {
  const node = await createNode({ type: 'go' })
  console.log('alice')
  console.log(await node.api.id())
  await node.stop()

  const nodeJs = await createNode({ type: 'js' })
  console.log('alice')
  console.log(await nodeJs.api.id())
  await nodeJs.stop()

  const nodeProc = await createNode({ type: 'proc' })
  console.log('bob')
  console.log(await nodeProc.api.id())
  await nodeProc.stop()
  process.exit()
}

run()
