'use strict'

const run = require('./run')

module.exports = (node, key, value, callback) => {
  run(
    node,
    ['config', key, value, '--json'],
    { env: node.env },
    callback
  )
}
