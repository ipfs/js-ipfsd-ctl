/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const { buildStartArgs } = require('../src/utils/buildArgs');
const { expect } = require('aegir/utils/chai')

describe('daemon start args', function () {

  it(`migrate`, () => {

    expect(buildStartArgs({
      opts: {
        ipfsOptions: {
          repoAutoMigrate: true,
        }
      }
    })).to.include('--migrate');

  })

})
