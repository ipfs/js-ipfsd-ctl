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

  it('.start', async function () {
    this.timeout(10 * 1000)
    server = new Server({ port: 12345 })

    await server.start()

    const port = await portUsed(12345)

    expect(port).to.not.equal(12345)
  })

  it('.stop', async () => {
    await server.stop()
  })
})
