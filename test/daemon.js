/* eslint-env mocha */
'use strict'

const daemon = require('./spawning')
const api = require('./api')
const DaemonFactory = require('../src')
const IPFS = require('ipfs')

describe('ipfsd-ctl', () => {
  // clean up IPFS env
  afterEach(() => Object.keys(process.env)
    .forEach((key) => {
      if (key.includes('IPFS')) {
        delete process.env[key]
      }
    }))

  describe('Go daemon', () => {
    const df = DaemonFactory.create({ type: 'go' })
    daemon(df, 'go')()
    api(df, 'go')()
  })

  describe('js daemon', () => {
    const df = DaemonFactory.create({ type: 'js' })
    daemon(df, 'js')()
    api(df, 'js')()
  })

  describe('In-process daemon', () => {
    daemon(DaemonFactory.create({ remote: false, type: 'proc', exec: IPFS }), 'proc')()
  })
})
