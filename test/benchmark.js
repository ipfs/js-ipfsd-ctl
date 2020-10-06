/* eslint-disable no-console */
/* eslint-env mocha */
'use strict'

const Benchmark = require('benchmark')
const suite = new Benchmark.Suite()
const { createNodeTests } = require('../src')

suite
  .add('ctl go 2048', {
    defer: true,
    fn: async (deferred) => {
      const node = await createNodeTests({
        type: 'go'
      })

      await node.stop()
      deferred.resolve()
    }
  })
  .add('ctl js 2048', {
    defer: true,
    fn: async (deferred) => {
      const node = await createNodeTests({
        type: 'js'
      })

      await node.stop()
      deferred.resolve()
    }
  })
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()
