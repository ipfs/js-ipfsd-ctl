/* eslint-env mocha */
'use strict'

const async = require('async')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

module.exports = () => {
  describe('should add and retrieve content', function () {
    const blorb = Buffer.from('blorb')
    let store
    let retrieve

    before(function (done) {
      this.timeout(30 * 1000)
      async.waterfall([
        (cb) => this.ipfsCtl.block.put(blorb, cb),
        (block, cb) => {
          store = block.cid.toBaseEncodedString()
          this.ipfsCtl.block.get(store, cb)
        },
        (_block, cb) => {
          retrieve = _block.data
          cb()
        }
      ], done)
    })

    it('should be able to store objects', () => {
      expect(store)
        .to.eql('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
    })

    it('should be able to retrieve objects', () => {
      expect(retrieve.toString()).to.be.eql('blorb')
    })

    it('should have started the daemon and returned an api with host/port', function () {
      expect(this.ipfsCtl).to.have.property('id')
      expect(this.ipfsCtl).to.have.property('apiHost')
      expect(this.ipfsCtl).to.have.property('apiPort')
    })

    it('should be able to store objects', () => {
      expect(store)
        .to.equal('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
    })

    it('should be able to retrieve objects', () => {
      expect(retrieve.toString()).to.equal('blorb')
    })
  })
}
