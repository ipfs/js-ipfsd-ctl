'use strict'

const hat = require('hat')
const Dexie = require('dexie').default

function createTempRepoPath () {
  return '/ipfs-' + hat()
}

function removeRepo (repoPath) {
  Dexie.delete(repoPath)
}

async function repoExists (repoPath) {
  const db = new Dexie(repoPath)
  const store = await db.open(repoPath)
  const table = store.table(repoPath)
  const count = await table.count()

  return count > 0
}

module.exports = {
  createTempRepoPath,
  removeRepo,
  repoExists
}
