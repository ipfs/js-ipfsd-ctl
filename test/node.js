/* eslint-env mocha */

'use strict'

require('./daemon')
require('./exec')

const startStop = require('./start-stop')
const install = require('./npm-installs')

describe('node', () => {
  describe('cleanup', () => {
    startStop(true)()
    startStop(false)()
  })

  describe('install', () => {
    install(true)()
    install(false)()
  })
})
