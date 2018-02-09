/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Server = require('../../src/remote/server')
const portUsed = require('detect-port')

describe('server', () => {
  let server

  it('.start', (done) => {
    server = new Server()

    server.start((err) => {
      expect(err).to.not.exist()
      portUsed(9999, (err, port) => {
        expect(err).to.not.exist()
        expect(port).to.not.equal(9999)
        done()
      })
    })
  })

  it('should stop', (done) => {
    server.stop(done)
  })
})
