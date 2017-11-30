/* eslint-env mocha */
'use strict'

const daemon = require('./spawning')
const isNode = require('detect-node')

let ipfsdFactory

if (isNode) {
  ipfsdFactory = require('../src')
} else {
  ipfsdFactory = require('../src/remote')()
}

describe('ipfsd-ctl', () => {
  // clean up IPFS env
  afterEach(() => Object.keys(process.env).forEach((key) => {
    if (key.includes('IPFS')) {
      delete process.env[key]
    }
  }))

  describe('Go daemon', () => {
    daemon(ipfsdFactory, false)()
  })

  describe('Js daemon', () => {
    daemon(ipfsdFactory, true)()
  })
})
