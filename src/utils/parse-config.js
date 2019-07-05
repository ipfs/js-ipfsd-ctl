'use strict'

const fs = require('fs-extra')
const path = require('path')

module.exports = async (configPath) => {
  const file = await fs.readFile(path.join(configPath, 'config'))

  return JSON.parse(file.toString())
}
