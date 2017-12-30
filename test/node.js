/* eslint-env mocha */

'use strict'

require('./daemon')
require('./exec')
require('./utils')
require('./remote/routes')
require('./remote/client')
require('./remote/server')

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
