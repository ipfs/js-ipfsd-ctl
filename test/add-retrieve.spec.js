/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const IPFSFactory = require('../src')
const JSIPFS = require('ipfs')

const tests = [
  { type: 'go', bits: 1024 },
  { type: 'js', bits: 512 },
  { type: 'proc', exec: JSIPFS, bits: 512 }
]

describe('data can be put and fetched', () => {
  tests.forEach((dfOpts) => describe(`${dfOpts.type}`, () => {
    let ipfsd

    before(async function () {
      this.timeout(30 * 1000)

      const f = IPFSFactory.create(dfOpts)

      ipfsd = await f.spawn({ initOptions: { bits: dfOpts.bits, profile: 'test' } })

      expect(ipfsd).to.exist()
      expect(ipfsd.api).to.exist()
      expect(ipfsd.api).to.have.property('id')
    })

    after(async function () {
      this.timeout(20 * 1000)
      await ipfsd.stop()
    })

    it('put and fetch a block', async function () {
      this.timeout(20 * 1000)

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
