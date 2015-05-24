
var ipfsd = require('../index.js')

ipfsd.disposable(function (err, api) {
  if (err) throw err
  api.id(function (err, id) {
    if (err) throw err
    console.log('alice')
    console.log(id)
  })
})

ipfsd.disposable(function (err, api) {
  if (err) throw err
  api.id(function (err, id) {
    if (err) throw err
    console.log('bob')
    console.log(id)
  })
})
