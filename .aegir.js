'use strict'

const tasks = require('./src/remote-factory/tasks')

module.exports = {
  hooks: {
    browser: {
      pre: tasks.start,
      post: tasks.stop
    }
  }
}
