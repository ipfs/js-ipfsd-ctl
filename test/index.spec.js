/* eslint-env mocha */
'use strict'

const ipfsd = require('../src')
const config = require('../src/config')
const exec = require('../src/exec')
const expect = require('chai').expect
const ipfsApi = require('ipfs-api')
const fs = require('fs')
const series = require('run-series')
const rimraf = require('rimraf')
const path = require('path')

describe('disposable node with local api', function () {
  this.timeout(30000)
  let ipfs
  let node

  before((done) => {
    // Remove default exec dir at start, if any
    rimraf.sync(config.defaultExecPath)
    ipfsd.create((err, ipfsNode) => {
      if (err) throw err
      node = ipfsNode
      node.startDaemon((err, ignore) => {
        if (err) throw err
        ipfs = ipfsApi(node.apiAddr)
        done()
      })
    })
  })

  it('the binary should be checked', () => {
    expect(node.checked).to.be.true
  })

  it('should have started the daemon and returned an api', () => {
    expect(ipfs).to.be.ok
    expect(ipfs.id).to.be.ok
  })

  it('should have downloaded the binary to the default directory', () => {
    expect(fs.existsSync(config.defaultExecPath)).to.be.true
  })

  let store, retrieve

  before((done) => {
    const blorb = Buffer('blorb')
    series([
      (cb) => {
        ipfs.block.put(blorb, (err, res) => {
          if (err) return cb(err)
          store = res.Key
          cb()
        })
      },
      (cb) => ipfs.block.get(store, cb)
    ], (err, results) => {
      if (err) return done(err)
      const res = results[1]
      let buf = ''
      res
        .on('data', (data) => {
          buf += data
        })
        .on('end', () => {
          retrieve = buf
          done()
        })
    })
  })

  it('should be able to store objects', () => {
    expect(store).to.be.equal('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
  })

  it('should be able to retrieve objects', () => {
    expect(retrieve).to.be.equal('blorb')
  })
})

describe('disposable node without being initialized', function () {
  this.timeout(30000)
  let node

  it('binary should not be checked and node should be clean', (done) => {
    ipfsd.create({init: false}, (err, ipfsNode) => {
      node = ipfsNode
      expect(err).to.not.exist
      expect(node.checked).to.be.false
      expect(node.clean).to.be.true
      done()
    })
  })

  it('binary should be checked and node should not be clean', (done) => {
    node.init((err, ignore) => {
      expect(err).to.not.exist
      expect(node.checked).to.be.true
      expect(node.clean).to.be.false
      expect(fs.existsSync(config.defaultExecPath)).to.be.true
      done()
    })
  })
})

describe('disposable node API', function () {
  this.timeout(30000)
  let ipfs
  before((done) => {
    ipfsd.create((err, node) => {
      if (err) throw err
      node.startDaemon((err) => {
        if (err) throw err
        ipfs = node.apiCtl()
        done()
      })
    })
  })

  it('should have started the daemon and returned an api with host/port', () => {
    expect(ipfs).to.be.ok
    expect(ipfs.id).to.be.ok
    expect(ipfs.apiHost).to.be.ok
    expect(ipfs.apiPort).to.be.ok
  })

  let store, retrieve

  before((done) => {
    const blorb = Buffer('blorb')
    series([
      (cb) => {
        ipfs.block.put(blorb, (err, res) => {
          if (err) return cb(err)
          store = res.Key
          cb()
        })
      },
      (cb) => ipfs.block.get(store, cb)
    ], (err, results) => {
      if (err) return done(err)
      const res = results[1]
      let buf = ''
      res
        .on('data', (data) => {
          buf += data
        })
        .on('end', () => {
          retrieve = buf
          done()
        })
    })
  })

  it('should be able to store objects', () => {
    expect(store).to.be.equal('QmPv52ekjS75L4JmHpXVeuJ5uX2ecSfSZo88NSyxwA3rAQ')
  })

  it('should be able to retrieve objects', () => {
    expect(retrieve).to.be.equal('blorb')
  })
})

describe('starting and stopping', function () {
  this.timeout(30000)
  let node

  describe('init', () => {
    before((done) => {
      ipfsd.create((err, res) => {
        if (err) throw err
        node = res
        done()
      })
    })

    it('should have returned a node', () => {
      expect(node).to.be.ok
    })

    it('daemon should not be running', () => {
      expect(node.subprocess).to.not.be.ok
    })
  })

  let pid

  describe('starting', () => {
    let ipfs
    before((done) => {
      node.startDaemon((err) => {
        if (err) throw err

        pid = node.subprocess.pid
        ipfs = node.apiCtl()

        // actually running?
        exec('kill', ['-0', pid], {cleanup: true}, done)
      })
    })

    it('should be running', () => {
      expect(ipfs.id).to.be.ok
    })
  })

  let stopped = false
  describe('stopping', () => {
    before((done) => {
      node.stopDaemon((err) => {
        if (err) throw err
        stopped = true
      })
      // make sure it's not still running
      const poll = setInterval(() => {
        exec('kill', ['-0', pid], {cleanup: true}, {
          error: () => {
            clearInterval(poll)
            done()
            done = () => {} // so it does not get called again
          }
        })
      }, 100)
    })

    it('should be stopped', () => {
      expect(node.subprocess).to.not.be.ok
      expect(stopped).to.be.true
    })
  })
})

describe('setting up and initializing a local node', () => {
  const testpath1 = '/tmp/ipfstestpath1'

  describe('cleanup', () => {
    before((done) => {
      rimraf(testpath1, done)
    })

    it('should not have a directory', () => {
      expect(fs.existsSync('/tmp/ipfstestpath1')).to.be.false
    })
  })

  describe('setup', () => {
    let node
    before((done) => {
      ipfsd.local(testpath1, (err, res) => {
        if (err) throw err
        node = res
        done()
      })
    })

    it('should have returned a node', () => {
      expect(node).to.be.ok
    })

    it('should not be initialized', () => {
      expect(node.initialized).to.be.false
    })

    describe('initialize', function () {
      this.timeout(30000)

      before((done) => node.init(done))

      it('should have made a directory', () => {
        expect(fs.existsSync(testpath1)).to.be.true
      })

      it('should be initialized', () => {
        expect(node.initialized).to.be.true
      })

      it('should be initialized', () => {
        expect(node.initialized).to.be.true
      })
    })
  })
})

describe('change config values of a disposable node', function () {
  this.timeout(30000)

  let ipfsNode

  before((done) => {
    ipfsd.create((err, node) => {
      if (err) {
        throw err
      }
      ipfsNode = node
      done()
    })
  })

  it('should return a config value', (done) => {
    ipfsNode.getConfig('Bootstrap', (err, config) => {
      if (err) {
        throw err
      }
      expect(config).to.be.ok
      done()
    })
  })

  it('should set a config value', (done) => {
    ipfsNode.setConfig('Bootstrap', null, (err) => {
      if (err) {
        throw err
      }

      ipfsNode.getConfig('Bootstrap', (err, config) => {
        expect(err).to.not.exist
        expect(config).to.be.null
        done()
      })
    })
  })

  it('should replace the config with new file', (done) => {
    const configPath = path.join(__dirname, 'test-data', 'config.json')
    const expectedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))

    ipfsNode.replaceConf(configPath, (err) => {
      expect(err).to.not.exist

      ipfsNode.getConfig('Bootstrap', (err, config) => {
        expect(err).to.not.exist
        expect(config).to.be.deep.equal(expectedConfig.Bootstrap)
        done()
      })
    })
  })

  it('should fail to read a bad config file', (done) => {
    const configPath = path.join(__dirname, 'test-data', 'badconfig')

    ipfsNode.replaceConf(configPath, (err, result) => {
      expect(err).to.exist
      done()
    })
  })
})

describe('external ipfs binaray', () => {
  it('allows passing via $IPFS_EXEC', (done) => {
    process.env.IPFS_EXEC = '/some/path'
    ipfsd.local((err, node) => {
      if (err) throw err

      expect(node.exec).to.be.equal('/some/path/ipfs')

      process.env.IPFS_EXEC = ''
      done()
    })
  })
})

describe('version', () => {
  it('prints the version of a node', (done) => {
    ipfsd.create((err, node) => {
      if (err) throw err
      node.version((err, version) => {
        if (err) throw err
        expect(version).to.be.ok
        done()
      })
    })
  })
})

describe('ipfs-api version', function () {
  this.timeout(30000)

  let ipfs

  before((done) => {
    ipfsd.create((err, node) => {
      if (err) throw err
      node.startDaemon((err, ignore) => {
        if (err) throw err
        ipfs = ipfsApi(node.apiAddr)
        done()
      })
    })
  })

  // NOTE: if you change ../src/, the hash will need to be changed
  it('uses the correct ipfs-api', (done) => {
    ipfs.add(path.join(__dirname, '../src'), { recursive: true }, (err, res) => {
      if (err) throw err

      const added = res[res.length - 1]
      expect(added).to.be.ok
      expect(added.Hash).to.be.equal('QmfWDSVeHDM8gCJoaNLkF8nYgAeaqs46Bowa1oBmsvDBAR')
      done()
    })
  })
})
