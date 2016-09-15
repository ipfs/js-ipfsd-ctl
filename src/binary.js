'use strict'

const BinWrapper = require('bin-wrapper')
const config = require('./config')

const binWrapper = new BinWrapper()
  .src(config.baseUrl + 'darwin-386.tar.gz', 'darwin', 'ia32')
  .src(config.baseUrl + 'darwin-amd64.tar.gz', 'darwin', 'x64')
  .src(config.baseUrl + 'freebsd-amd64.tar.gz', 'freebsd', 'x64')
  .src(config.baseUrl + 'linux-386.tar.gz', 'linux', 'ia32')
  .src(config.baseUrl + 'linux-amd64.tar.gz', 'linux', 'x64')
  .src(config.baseUrl + 'linux-arm.tar.gz', 'linux', 'arm')
  .src(config.baseUrl + 'windows-386.tar.gz', 'win32', 'ia32')
  .src(config.baseUrl + 'windows-amd64.tar.gz', 'win32', 'x64')
  .use(process.platform === 'win32' ? 'ipfs.exe' : 'ipfs')

function Binary (execPath) {
  // Set dest path for the exec file
  binWrapper.dest(process.env.IPFS_EXEC || execPath || config.defaultExecPath)
  return {
    path: () => binWrapper.path(),
    // Has the binary been checked?
    checked: false,
    // Check that the binary exists and works
    check (cb) {
      if (this.checked) return cb()
      binWrapper.run(['version'], (err) => {
        // The binary is ok if no error poped up
        this.checked = !err
        return cb(err)
      })
    }
  }
}

module.exports = Binary
