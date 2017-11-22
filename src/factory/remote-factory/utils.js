'use strict'

exports.toPayload = (args) => JSON.stringify({ args })

exports.toRes = (payload, cb) => {
  payload = JSON.parse(payload)
  if (payload.err) {
    return cb(payload.err)
  }

  return cb(null, payload.data)
}

exports.parsePayload = (data) => {
  const args = JSON.parse(data).args
  if (!Array.isArray(args)) {
    throw new Error('args field should be an array')
  }

  return args
}
