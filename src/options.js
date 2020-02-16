'use strict'

const { isNode } = require('ipfs-utils/src/env')

/**
 * handle ControllerOptions
 * @param {Factory} ctx
 * @param {ControllerOptions} options
 * @returns {Promise<ControllerOptions>}
 */
const handleFactoryOptions = async (ctx, options = { }) => {
  const type = options.type || ctx.opts.type
  const opts = merge(
    ctx.overrides[type],
    options
  )

  if (typeof opts.ipfsHttpModule === 'undefined') {
    opts.ipfsHttpModule = require('ipfs-http-client')
  }

  if (isNode && (typeof opts.ipfsModule === 'undefined' || typeof opts.ipfsBin === 'undefined')) {
    if (type === 'js') {
      if (typeof opts.ipfsModule === 'undefined') {
        opts.ipfsModule = require('ipfs')
      }
      if (typeof opts.ipfsBin === 'undefined') {
        opts.ipfsBin = require.resolve('ipfs/src/cli/bin.js')
      }
    } else if (type === 'go') {
      if (typeof opts.ipfsBin === 'undefined') {
        opts.ipfsBin = require('go-ipfs-dep').path()
      }
    }
  }

  return {
    type,
    opts
  }
}

module.exports = handleFactoryOptions
