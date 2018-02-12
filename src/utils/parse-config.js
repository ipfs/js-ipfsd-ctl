'use strict'

const waterfall = require('async/waterfall')
const fs = require('fs')
const path = require('path')
const safeParse = require('safe-json-parse/callback')

module.exports = (configPath, callback) => {
  waterfall([
    (cb) => fs.readFile(path.join(configPath, 'config'), cb),
    (file, cb) => safeParse(file.toString(), cb)
  ], callback)
}
