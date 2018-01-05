/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const fs = require('fs')
const path = require('path')
const utils = require('../src/utils')
const flatten = utils.flatten
const tempDir = utils.tempDir
const findIpfsExecutable = utils.findIpfsExecutable
const createRepo = utils.createRepo

const IPFSRepo = require('ipfs-repo')

describe('utils', () => {
  describe('.flatten', () => {
    it('should flatten', () => {
      expect(flatten({ a: { b: { c: [1, 2, 3] } } })).to.deep.equal({ 'a.b.c': [1, 2, 3] })
    })

    it('should handle nulls', () => {
      expect(flatten(null)).to.deep.equal({})
    })

    it('should handle undefined', () => {
      expect(flatten(undefined)).to.deep.equal({})
    })
  })

  describe('.tempDir', () => {
    it('should create tmp directory path for go-ipfs', () => {
      const tmpDir = tempDir()
      expect(tmpDir).to.exist()
      expect(tmpDir).to.include('ipfs_')
    })

    it('should create tmp directory path for js-ipfs', () => {
      const tmpDir = tempDir(true)
      expect(tmpDir).to.exist()
      expect(tmpDir).to.include('jsipfs_')
    })
  })

  describe('.findIpfsExecutable', () => {
    it('should find go executable', () => {
      const execPath = findIpfsExecutable('go', __dirname)
      expect(execPath).to.exist()
      expect(execPath).to.include(path.join('go-ipfs-dep', 'go-ipfs', 'ipfs'))
      expect(fs.existsSync(execPath)).to.be.ok()
    })

    it('should find go executable', () => {
      const execPath = findIpfsExecutable('js', __dirname)
      expect(execPath).to.exist()
      expect(execPath).to.include(path.join('ipfs', 'src', 'cli', 'bin.js'))
      expect(fs.existsSync(execPath)).to.be.ok()
    })
  })

  describe('.createRepo', () => {
    let repo = null
    let repoPath = tempDir()
    it('should create repo', () => {
      repo = createRepo(repoPath)
      expect(repo).to.exist()
      expect(repo).to.be.instanceOf(IPFSRepo)
      expect(fs.existsSync(repoPath)).to.be.ok()
    })

    it('should cleanup repo', (done) => {
      repo.teardown((err) => {
        expect(err).to.not.exist()
        expect(!fs.existsSync(repoPath)).to.be.ok()
        done()
      })
    })
  })
})
