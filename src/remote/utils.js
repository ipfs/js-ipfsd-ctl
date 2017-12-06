'use strict'

const Qs = require('qs')
const mapValues = require('lodash.mapvalues')

exports.getResponse = (res, cb) => {
  let data = ''
  res.on('data', function (buf) {
    data += buf.toString()
  })

  res.on('end', () => {
    const response = JSON.parse(data)
    if (typeof response.statusCode !== 'undefined' && response.statusCode !== 200) {
      return cb(new Error(response.message))
    }

    cb(null, response)
  })

  res.on('err', cb)
}

exports.encodeParams = (id, params) => {
  return Qs.stringify({ id, params })
}

exports.makeResponse = (id, data) => {
  return { _id: id, data: data }
}

exports.parseQuery = (query) => {
  // sadly `parse` doesn't deal with booleans correctly
  // and since HAPI gives a partially processed query
  // string, the `decoder` hook never gets called,
  // hence the use of mapValues
  let parsed = Qs.parse(query)
  const transformer = (val) => {
    if (typeof val === 'object') {
      return mapValues(val, transformer)
    }

    if (val === 'true' || val === 'false') {
      val = val === 'true'
    }

    return val
  }

  return mapValues(parsed, transformer)
}
