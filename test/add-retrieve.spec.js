/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const IPFSFactory = require('../src')

const tests = [
  { type: 'go' },
  { type: 'js' },
  { type: 'proc' }
]

describe('data can be put and fetched', function () {
  this.timeout(30000)
  tests.forEach((dfOpts) => describe(`${dfOpts.type}`, () => {
    let ipfsd

    before(async function () {
      const f = IPFSFactory.create(dfOpts)

      ipfsd = await f.spawn()

      expect(ipfsd).to.exist()
      expect(ipfsd.api).to.exist()
      expect(ipfsd.api).to.have.property('id')
    })

    after(() => ipfsd.stop())

    it('put and fetch a block', async function () {
      const data = Buffer.from('blorb')
      const block = await ipfsd.api.block.put(data)
      const cidStr = block.cid.toBaseEncodedString()

      expect(cidStr)
        .to.eql('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')

      const fetched = await ipfsd.api.block.get(cidStr)
      expect(fetched.data).to.eql(data)
    })
  }))
})
