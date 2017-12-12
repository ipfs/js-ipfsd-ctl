/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const ipfsApi = require('ipfs-api')
const multiaddr = require('multiaddr')
const os = require('os')

const isWindows = os.platform() === 'win32'

module.exports = (ipfsdController, isJs) => {
  return () => {
    const API_PORT = isJs ? '5002' : '5001'
    const GW_PORT = isJs ? '9090' : '8080'

    describe('ipfs-api version', () => {
      let ipfs
      let node

      before(function (done) {
        this.timeout(20 * 1000)
        ipfsdController.spawn({ start: false }, (err, ret) => {
          expect(err).to.not.exist()
          node = ret.ctrl
          node.startDaemon((err, ignore) => {
            expect(err).to.not.exist()
            ipfs = ipfsApi(node.apiAddr)
            done()
          })
        })
      })

      after((done) => node.stopDaemon(done))

      // skip on windows for now
      // https://github.com/ipfs/js-ipfsd-ctl/pull/155#issuecomment-326970190
      // fails on windows see https://github.com/ipfs/js-ipfs-api/issues/408
      if (isWindows || !isNode) {
        return it.skip('uses the correct ipfs-api')
      }

      it('uses the correct ipfs-api', (done) => {
        ipfs.util.addFromFs(path.join(__dirname, 'fixtures/'), {
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
        this.timeout(20 * 1000)
        ipfsdController.spawn({ isJs, config: null }, (err, ipfsd) => {
          expect(err).to.not.exist()
          const api = ipfsd.ctl
          const node = ipfsd.ctrl

          // Check for props in daemon
          expect(node).to.have.property('apiAddr')
          expect(node).to.have.property('gatewayAddr')
          expect(node.apiAddr).to.not.equal(null)
          expect(multiaddr.isMultiaddr(node.apiAddr)).to.equal(true)
          expect(node.gatewayAddr).to.not.equal(null)
          expect(multiaddr.isMultiaddr(node.gatewayAddr)).to.equal(true)

          // Check for props in ipfs-api instance
          expect(api).to.have.property('apiHost')
          expect(api).to.have.property('apiPort')
          expect(api).to.have.property('gatewayHost')
          expect(api).to.have.property('gatewayPort')
          expect(api.apiHost).to.equal('127.0.0.1')
          expect(api.apiPort).to.equal(API_PORT)
          expect(api.gatewayHost).to.equal('127.0.0.1')
          expect(api.gatewayPort).to.equal(GW_PORT)

          node.stopDaemon(done)
        })
      })

      it('allows passing flags', function (done) {
        // skip in js, since js-ipfs doesn't fail on unrecognized args, it prints the help instead
        if (isJs) {
          this.skip()
        } else {
          ipfsdController.spawn({ start: false }, (err, ipfsd) => {
            expect(err).to.not.exist()
            ipfsd.ctrl.startDaemon(['--should-not-exist'], (err) => {
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