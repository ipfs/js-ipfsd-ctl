'use strict'

const localController = require('./local')
const remote = require('./remote')

module.exports = {
  localController,
  remoteController: remote.remoteController,
  server: remote.server
}
