/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const setImmediate = require('async/setImmediate')
const IpfsFactory = require('../src')

describe('custom API', function () {
  this.timeout(30 * 1000)

  it('should create a factory with a custom API', done => {
    const mockApi = { shutdown: cb => setImmediate(() => cb()) }

    const f = IpfsFactory.create({
      type: 'js',
      initOptions: { bits: 512 },
      IpfsApi: () => mockApi
    })

    f.spawn((err, ipfsd) => {
      if (err) return done(err)
      expect(ipfsd.api).to.equal(mockApi)
      ipfsd.stop(done)
    })
  })
})
