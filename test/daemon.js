/* eslint-env mocha */
'use strict'

const daemon = require('./spawning')
const isNode = require('detect-node')
const factory = require('../src')

let ipfsdController

if (isNode) {
  ipfsdController = factory.localController
} else {
  ipfsdController = factory.remoteController()
}

describe('ipfsd-ctl', () => {
  // clean up IPFS env
  afterEach(() => Object.keys(process.env).forEach((key) => {
    if (key.includes('IPFS')) {
      delete process.env[key]
    }
  }))

  describe('Go daemon', () => {
    daemon(ipfsdController, false)()
  })

  describe('Js daemon', () => {
    daemon(ipfsdController, true)()
  })
})
