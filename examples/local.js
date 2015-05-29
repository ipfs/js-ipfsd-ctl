
var ipfsd = require('../index.js')

// opens an api connection to local running ipfs node

ipfsd.local(function (err, ipfs) {
  console.log(ipfs)
})
