'use strict'

const { isBrowser, isWebWorker } = require('ipfs-utils/src/env')

module.exports = ({ type }) => {
  let swarm

  // from the browser tell remote nodes to listen over WS
  if (type !== 'proc' && (isBrowser || isWebWorker)) {
    swarm = ['/ip4/127.0.0.1/tcp/0/ws']
  // from the browser, in process nodes cannot listen on _any_ addrs
  } else if (type === 'proc' && (isBrowser || isWebWorker)) {
    swarm = []
  } else {
    swarm = ['/ip4/127.0.0.1/tcp/0']
  }

  return {
    API: {
      HTTPHeaders: {
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': [
          'PUT',
          'POST',
          'GET'
        ]
      }
    },
    Addresses: {
      Swarm: swarm,
      API: '/ip4/127.0.0.1/tcp/0',
      Gateway: '/ip4/127.0.0.1/tcp/0',
      RPC: '/ip4/127.0.0.1/tcp/0'
    }
  }
}
