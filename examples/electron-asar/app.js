/* eslint no-console: 0 */
// @ts-check
const electron = require('electron')
const { path } = require('kubo')
const { create } = require('kubo-rpc-client')
/**
 * @type {import('../../src')}
 */
const { createNode, createServer } = require('../../src')
const app = electron.app
const ipcMain = electron.ipcMain
const BrowserWindow = electron.BrowserWindow

app.on('ready', () => {
  const win = new BrowserWindow({
    title: 'loading',
    webPreferences: {
      nodeIntegration: true
    }
  })
  win.loadURL(`file://${app.getAppPath()}/public/index.html`)
})

ipcMain.on('start', async ({ sender }) => {
  console.log('starting disposable IPFS')
  sender.send('message', 'starting disposable IPFS')
  try {
    const s = createServer({
      port: 43134
    }, {
      type: 'kubo',
      rpc: create,
      bin: path()
    })
    await s.start()
    const node = await createNode({
      type: 'kubo',
      rpc: create,
      bin: path()
    })
    console.log('get id')
    sender.send('message', 'get id')

    const id = await node.api.id()
    console.log('got id', id)
    sender.send('id', JSON.stringify(id))
    await node.stop()
    await s.stop()
  } catch (/** @type {any} */ error) {
    sender.send('error', JSON.stringify(error.message))
    console.log(error)
  }
})
