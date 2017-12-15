/* eslint-env mocha */
'use strict'

const daemon = require('./spawning')
const api = require('./api')
const DaemonFactory = require('../src')

describe('ipfsd-ctl', () => {
  const df = DaemonFactory.create()

  // clean up IPFS env
  afterEach(() => Object.keys(process.env)
    .forEach((key) => {
      if (key.includes('IPFS')) {
        delete process.env[key]
      }
    }))

  describe('Go daemon', () => {
    daemon(df, false)()
    api(df, false)
  })

  describe('Js daemon', () => {
    daemon(df, true)()
    api(df, false)
  })
})
