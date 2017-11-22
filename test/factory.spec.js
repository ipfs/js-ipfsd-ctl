/* eslint-env mocha */

'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Factory = require('../src/factory')

const factory = new Factory()
describe('Factory', () => {
  let node = null
  let hash = null

  it('should start node', function (done) {
    factory.spawnNode((err, n) => {
      expect(err).to.not.exist()
      node = n
      done()
    })
  })

  it('should add to running node', (done) => {
    node.files.add(Buffer.from('Hello!'), (err, res) => {
      expect(err).to.not.exist()
      expect(res).to.exist()
      hash = res[0].hash
      done()
    })
  })

  it('should cat from running node', (done) => {
    node.files.cat(hash, (err, buffer) => {
      expect(err).to.not.exist()
      expect(buffer).to.exist()
      expect(buffer.toString()).to.equal('Hello!')
      done()
    })
  })

  it('should stop running nodes', function (done) {
    factory.dismantle((err) => {
      expect(err).to.not.exist()
      done()
    })
  })
})
