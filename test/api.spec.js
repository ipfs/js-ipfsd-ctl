/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const series = require('async/series')
const multiaddr = require('multiaddr')
const path = require('path')
const DaemonFactory = require('../src')
const isNode = require('detect-node')

const tests = [
  { type: 'go' },
  { type: 'js' }
  // { type: 'proc', exec: JSIPFS }
]

describe('ipfsd.api for Daemons', () => {
  tests.forEach((dfOpts) => describe(`${dfOpts.type}`, () => {
    const API_PORT = '5101'
    const GW_PORT = '8180'

    const config = {
      Addresses: {
        API: `/ip4/127.0.0.1/tcp/${API_PORT}`,
        Gateway: `/ip4/127.0.0.1/tcp/${GW_PORT}`
      }
    }
    let df

    before(() => {
      df = DaemonFactory.create(dfOpts)
    })

    it('test the ipfsd.api', function (done) {
      this.timeout(50 * 1000)

      // TODO skip in browser - can we avoid using file system operations here?
      if (!isNode) { return this.skip() }

      let ipfsd
      let api

      series([
        (cb) => {
          df.spawn({
            start: false,
            config: config,
            initOptions: { bits: 1024 }
          }, (err, _ipfsd) => {
            expect(err).to.not.exist()
            ipfsd = _ipfsd
            ipfsd.start((err, _api) => {
              expect(err).to.not.exist()
              api = _api
              cb()
            })
          })
        },
        (cb) => {
          api.util.addFromFs(path.join(__dirname, 'fixtures/'), {
            recursive: true
          }, (err, res) => {
            expect(err).to.not.exist()
            expect(res.length).to.equal(4)

            const fixuresDir = res.find(file => file.path === 'fixtures')
            expect(fixuresDir).to.have.property(
              'hash',
              'QmR9731QMXHCjK2EvoQZNhMHVE77tGMbgPFXMWPHztMV4a'
            )

            const testFile = res.find(file => file.path === 'fixtures/test.txt')
            expect(testFile).to.have.property(
              'hash',
              'Qmf412jQZiuVUtdgnB36FXFX7xg5V6KEbSJ4dpQuhkLyfD'
            )

            cb()
          })
        },
        (cb) => {
          ipfsd.stop(cb)
        }
      ], done)
    })

    it('check if API and Gateway addrs are correct', function (done) {
      this.timeout(50 * 1000)

      df.spawn({
        config: config,
        initOptions: { bits: 1024 }
      }, (err, _ipfsd) => {
        expect(err).to.not.exist()
        const ipfsd = _ipfsd

        // Check for props in daemon
        expect(ipfsd).to.have.property('apiAddr')
        expect(ipfsd).to.have.property('gatewayAddr')
        expect(ipfsd.apiAddr).to.not.be.null()
        expect(multiaddr.isMultiaddr(ipfsd.apiAddr)).to.equal(true)
        expect(ipfsd.gatewayAddr).to.not.be.null()
        expect(multiaddr.isMultiaddr(ipfsd.gatewayAddr)).to.equal(true)

        // Check for props in ipfs-api instance
        expect(ipfsd.api).to.have.property('apiHost')
        expect(ipfsd.api).to.have.property('apiPort')
        expect(ipfsd.api).to.have.property('gatewayHost')
        expect(ipfsd.api).to.have.property('gatewayPort')
        expect(ipfsd.api.apiHost).to.equal('127.0.0.1')
        expect(ipfsd.api.apiPort).to.equal(API_PORT)
        expect(ipfsd.api.gatewayHost).to.equal('127.0.0.1')
        expect(ipfsd.api.gatewayPort).to.equal(GW_PORT)

        ipfsd.stop(done)
      })
    })
  }))
})
