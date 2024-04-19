import type { NodeType } from './index.js'

export interface ConfigInit {
  type?: NodeType
}

export default (init: ConfigInit): any => {
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
      Swarm: [
        '/ip4/127.0.0.1/tcp/0/ws',
        '/ip4/127.0.0.1/tcp/0'
      ],
      API: '/ip4/127.0.0.1/tcp/0',
      Gateway: '/ip4/127.0.0.1/tcp/0',
      RPC: '/ip4/127.0.0.1/tcp/0'
    }
  }
}
