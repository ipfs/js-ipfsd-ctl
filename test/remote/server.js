/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Server = require('../../src/remote-node/server')
const portUsed = require('detect-port')

describe('server', () => {
  let server
  before((done) => {
    server = new Server()
    server.start(done)
  })

  it('should start', (done) => {
    portUsed(9999, (err, port) => {
      expect(err).to.not.exist()
      expect(port !== 9999).to.be.ok()
      done()
    })
  })

  it('should stop', (done) => {
    server.stop(done)
  })
})
