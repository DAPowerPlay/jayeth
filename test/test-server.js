exports.startServer = function (port, ns) {
  var jayson = require('jayson')
  var debug = require('debug')(ns)

  // create a server
  var server = jayson.server({
    add: function (args, callback) {
      debug('add')
      callback(null, ns)
    },
    substract: function (args, callback) {
      debug('substract')
      callback(null, ns)
    },
    multiply: function (args, callback) {
      debug('multiply')
      callback(null, ns)
    }
  })

  debug('starting %s', ns)

  server.http().listen(port)

  return server
}
