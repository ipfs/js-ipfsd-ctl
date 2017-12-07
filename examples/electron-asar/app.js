/* eslint no-console: 0 */
'use strict'

const { app, ipcMain, BrowserWindow } = require('electron')
const ipfsd = require('../..')

app.on('ready', () => {
  const win = new BrowserWindow({
    title: 'loading'
  })
  win.loadURL(`file://${app.getAppPath()}/public/index.html`)
})

ipcMain.on('start', ({ sender }) => {
  console.log('starting disposable IPFS')
  sender.send('message', 'starting disposable IPFS')

  ipfsd.localController.spawn((err, ipfsd) => {
    if (err) {
      sender.send('error', err)
      throw err
    }

    const ipfs = ipfsd.ctl
    console.log('get id')
    sender.send('message', 'get id')
    ipfs.id(function (err, id) {
      if (err) {
        sender.send('error', err)
        throw err
      }
      console.log('got id', id)
      sender.send('id', JSON.stringify(id))
    })
  })
})
