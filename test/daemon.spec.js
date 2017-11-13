/* eslint-env mocha */
'use strict'

const daemon = require('./spawning-daemons.js')

describe('ipfsd-ctl', () => {
  describe('Go daemon', () => {
    daemon(false)()
  })

  describe('Js daemon', () => {
    daemon(true)()
  })
})
