'use strict'
const tempWrite = require('temp-write')
const merge = require('merge-options')

function configFile (type, config) {
  return tempWrite(JSON.stringify(merge({}, config)), 'config.json')
}

module.exports = {
  configFile
}
