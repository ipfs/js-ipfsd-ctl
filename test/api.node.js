/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const multiaddr = require('multiaddr')
const os = require('os')
const path = require('path')

const isNode = require('detect-node')
const isWindows = os.platform() === 'win32'

module.exports = (df, type) => {
  return () => {
    const API_PORT = '5101'
    const GW_PORT = '8180'

    const config = {
      Addresses: {
        API: `/ip4/127.0.0.1/tcp/${API_PORT}`,
        Gateway: `/ip4/127.0.0.1/tcp/${GW_PORT}`
      }
    }

    describe('ipfs-api version', () => {
      let ipfsd
      let api

      before(function (done) {
        this.timeout(50 * 1000)
        df.spawn({ start: false, config }, (err, daemon) => {
          expect(err).to.not.exist()
          ipfsd = daemon
          ipfsd.start((err, res) => {
            expect(err).to.not.exist()
            api = res
            done()
          })
        })
      })

      after((done) => ipfsd.stop(done))

      // skip on windows for now
      // https://github.com/ipfs/js-ipfsd-ctl/pull/155#issuecomment-326970190
      // fails on windows see https://github.com/ipfs/js-ipfs-api/issues/408
      if (isWindows || !isNode) {
        return it.skip('uses the correct ipfs-api')
      }

      it('uses the correct ipfs-api', (done) => {
        api.util.addFromFs(path.join(__dirname, 'fixtures/'), {
          recursive: true
        }, (err, res) => {
          expect(err).to.not.exist()

          const added = res[res.length - 1]

          // Temporary: Need to see what is going on on windows
          expect(res).to.deep.equal([
            {
              path: 'fixtures/test.txt',
              hash: 'Qmf412jQZiuVUtdgnB36FXFX7xg5V6KEbSJ4dpQuhkLyfD',
              size: 19
            },
            {
              path: 'fixtures',
              hash: 'QmXkiTdnfRJjiQREtF5dWf2X4V9awNHQSn9YGofwVY4qUU',
              size: 73
            }
          ])

          expect(res.length).to.equal(2)
          expect(added).to.have.property('path', 'fixtures')
          expect(added).to.have.property(
            'hash',
            'QmXkiTdnfRJjiQREtF5dWf2X4V9awNHQSn9YGofwVY4qUU'
          )
          expect(res[0]).to.have.property('path', 'fixtures/test.txt')
          expect(res[0]).to.have.property(
            'hash',
            'Qmf412jQZiuVUtdgnB36FXFX7xg5V6KEbSJ4dpQuhkLyfD'
          )
          done()
        })
      })
    })

    describe('validate api', () => {
      it('starts the daemon and returns valid API and gateway addresses', function (done) {
        this.timeout(50 * 1000)
        df.spawn({ config }, (err, _ipfsd) => {
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

      it('allows passing flags', function (done) {
        // skip in js, since js-ipfs doesn't fail on unrecognized args, it prints the help instead
        if (type) {
          this.skip()
        } else {
          df.spawn({ start: false }, (err, ipfsd) => {
            expect(err).to.not.exist()
            ipfsd.start(['--should-not-exist'], (err) => {
              expect(err).to.exist()
              expect(err.message)
                .to.match(/Unrecognized option 'should-not-exist'/)

              done()
            })
          })
        }
      })
    })
  }
}
