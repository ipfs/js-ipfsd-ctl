/* eslint-env mocha */
'use strict'

const daemon = require('./spawning')
const api = require('./api')
const controllerFactory = require('../src')

describe('ipfsd-ctl', () => {
  const daemonFactory = controllerFactory()

  // clean up IPFS env
  afterEach(() => Object.keys(process.env)
    .forEach((key) => {
      if (key.includes('IPFS')) {
        delete process.env[key]
      }
    }))

  describe('Go daemon', () => {
    daemon(daemonFactory, false)()
    api(daemonFactory, false)
  })

  describe('Js daemon', () => {
    daemon(daemonFactory, true)()
    api(daemonFactory, false)
  })
})
