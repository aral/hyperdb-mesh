
// hyperdb mesh

var swarmDefaults = require('dat-swarm-defaults')
var discovery     = require('discovery-swarm')
var encoding      = require('dat-encoding')
var inherits      = require('inherits')
var hyperdb       = require('hyperdb')
var events        = require('events')
var crypto        = require('crypto')

function hyperdb_mesh (storage, href, opts) {
  if (!(this instanceof hyperdb_mesh)) return new hyperdb_mesh(storage, href, opts)
  if (!opts) opts = {}
  events.EventEmitter.call(this)
  var self     = this
  self.id      = opts.id || crypto.randomBytes(11).toString('hex')
  self.options = opts.options || { valueEncoding: 'utf-8' }
  try {
    var key    = encoding.decode(href)
    self.addr  = encoding.encode(key)
  } catch (e) {
    self.addr  = null
  }
  self.db = self.addr
    ? hyperdb(storage, self.addr, self.options)
    : hyperdb(storage, self.options)
  self.db.on('ready', function () {
    self.swarm = discovery(swarmDefaults({
      id: self.db.local.key,
      stream: function (peer) {
        return self.replicate()
      }
    }))
    var key = self.addr || self.db.key
    self.swarm.join(key.toString('hex'))
    self.swarm.on('connection', self.onconnection.bind(self))
    self.emit('ready')
  })
}

inherits(hyperdb_mesh, events.EventEmitter)

hyperdb_mesh.prototype.onconnection = function (peer) {
  var self = this
  if (!peer.remoteUserData) return
  try {
    var data = JSON.parse(peer.remoteUserData)
  } catch (err) { return }
  var key = Buffer.from(data.key)
  var id = data.id
  self.db.authorized(key, function (err, auth) {
    if (err) return console.log(err)
    if (!auth) {
      self.db.authorize(key, function (err) {
        if (err) return console.log(err)
      })
    }
  })
}

hyperdb_mesh.prototype.replicate = function () {
  var self = this
  return this.db.replicate({
    live: true,
    userData: JSON.stringify({
      key: self.db.local.key,
      username: self.id
    })
  })
}

module.exports = hyperdb_mesh
