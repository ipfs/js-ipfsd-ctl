/* eslint no-console: 0 */
'use strict'

const electron = require('electron')
const app = electron.app
const ipcMain = electron.ipcMain
const BrowserWindow = electron.BrowserWindow

const { createController, createServer } = require('ipfsd-ctl')

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
      host: '127.0.0.1',
      port: 43134
    }, {
      type: 'go',
      ipfsBin: require('go-ipfs').path(),
      ipfsHttpModule: require('ipfs-http-client')
    })
    await s.start()
    const node = await createController({
      type: 'go',
      ipfsHttpModule: require('ipfs-http-client')
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
