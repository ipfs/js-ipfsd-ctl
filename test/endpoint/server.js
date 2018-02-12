/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Server = require('../../src/endpoint/server')
const portUsed = require('detect-port')

describe('endpoint server', () => {
  let server

  it('.start', function (done) {
    this.timeout(10 * 1000)
    server = new Server({ port: 12345 })

    server.start((err) => {
      expect(err).to.not.exist()
      portUsed(12345, (err, port) => {
        expect(err).to.not.exist()
        expect(port).to.not.equal(12345)
        done()
      })
    })
  })

  it('.stop', (done) => {
    server.stop(done)
  })
})
