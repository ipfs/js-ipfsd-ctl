/* eslint-env mocha */

'use strict'

require('./daemon')
require('./exec')
require('./utils')

const startStop = require('./start-stop')
const install = require('./npm-installs')

describe('node', () => {
  describe('cleanup', () => {
    startStop('go')()
    startStop('js')()
  })

  describe('install', () => {
    install('go')()
    install('js')()
  })
})
