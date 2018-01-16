/* eslint no-console: 0 */
'use strict'

const electron = require('electron')
const app = electron.app
const ipcMain = electron.ipcMain
const BrowserWindow = electron.BrowserWindow

const DaemonFactory = require('ipfsd-ctl')
const df = DaemonFactory.create()

app.on('ready', () => {
  const win = new BrowserWindow({
    title: 'loading'
  })
  win.loadURL(`file://${app.getAppPath()}/public/index.html`)
})

ipcMain.on('start', ({ sender }) => {
  console.log('starting disposable IPFS')
  sender.send('message', 'starting disposable IPFS')

  df.spawn((err, ipfsd) => {
    if (err) {
      sender.send('error', err)
      throw err
    }

    console.log('get id')
    sender.send('message', 'get id')
    ipfsd.api.id((err, id) => {
      if (err) {
        sender.send('error', err)
        throw err
      }
      console.log('got id', id)
      sender.send('id', JSON.stringify(id))
      ipfsd.stop()
    })
  })
})
