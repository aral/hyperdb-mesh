
var Mesh   = require('.')
var ram    = require('random-access-memory')
var assert = require('assert')
var mesh1  = Mesh(ram, null, { id: 'mesh1' })
var db1    = mesh1.db

var value = ''

mesh1.on('ready', function () {
  var mesh2 = Mesh(ram, mesh1.db.key, { id: 'mesh2' })
  var db2   = mesh2.db
  mesh2.on('ready', function () {
    db1.watch('/test', function () {
      db1.get('/test', function (e, d) {
        value = d[0].value
      })
    })
    db2.watch('/test', function () {
      db2.get('/test', function (e, d) {
        var stream = db2.createReadStream('/')
        stream.on('data', function (d) {
          console.log('>', d)
        })
        stream.on('finish', function () {
          assert.ok(value === d[0].value)
          process.exit(0)
        })
      })
    })
    db1.put('/test', 'abc', function (e) {
      if (e) throw e
    })
  })
})

setTimeout(function () {
  process.exit(1)
}, 5000)
