'use strict'

// taken from https://github.com/hughsk/flat
module.exports = (target) => {
  const output = {}
  const step = (object, prev) => {
    object = object || {}
    Object.keys(object).forEach(function (key) {
      const value = object[key]
      const isarray = Array.isArray(value)
      const type = Object.prototype.toString.call(value)
      const isbuffer = Buffer.isBuffer(value)
      const isobject = (
        type === '[object Object]' ||
        type === '[object Array]'
      )

      const newKey = prev
        ? prev + '.' + key
        : key

      if (!isarray && !isbuffer && isobject && Object.keys(value).length) {
        return step(value, newKey)
      }

      output[newKey] = value
    })
  }

  step(target)

  return output
}
