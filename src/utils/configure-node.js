'use strict'

const eachOfSeries = require('async/eachOfSeries')
const setConfigValue = require('./set-config-value')

module.exports = (node, conf, callback) => {
  eachOfSeries(conf, (value, key, cb) => {
    setConfigValue(node, key, JSON.stringify(value), cb)
  }, callback)
}
