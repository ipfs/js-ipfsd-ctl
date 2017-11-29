/* eslint-env mocha */
'use strict'

const daemon = require('./spawning-daemons.js')
const install = require('./npm-installs')

describe('ipfsd-ctl', () => {
  afterEach(() => Object.keys(process.env).forEach((key) => {
    if (key.includes('IPFS')) {
      delete process.env[key] // clean up IPFS envs
    }
  }))

  describe('Go daemon', () => {
    daemon(false)()
    install(false)()
  })

  describe('Js daemon', () => {
    daemon(true)()
    install(true)()
  })
})
