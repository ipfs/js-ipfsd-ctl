/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const fs = require('fs')
const utils = require('../src/utils')
const flatten = utils.flatten
const tempDir = utils.tempDir
const findIpfsExecutable = utils.findIpfsExecutable

describe('utils', () => {
  describe('flatten config', () => {
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

  describe('tmp dir', () => {
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

  describe('find executable', () => {
    it('should find go executable', () => {
      const execPath = findIpfsExecutable('go', __dirname)
      expect(execPath).to.exist()
      expect(execPath).to.include('go-ipfs-dep/go-ipfs/ipfs')
      expect(fs.existsSync(execPath)).to.be.ok()
    })

    it('should find go executable', () => {
      const execPath = findIpfsExecutable('js', __dirname)
      expect(execPath).to.exist()
      expect(execPath).to.include('ipfs/src/cli/bin.js')
      expect(fs.existsSync(execPath)).to.be.ok()
    })
  })
})
