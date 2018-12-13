const Jayson = require('Jayson')
const async = require('async')
const RpcEndpoints = require('weighted-round-robin')
const debug = require('debug')('jayeth:main')

function jayeth (config) {
  this.rpcEndpoints = new RpcEndpoints()

  if (typeof config === 'undefined' || typeof config !== 'object') {
    debug('No jayeth config provided, process exiting!', config)
    process.exit(1)
  }

  this.config = config

  if (typeof this.config.only_defined_methods === 'undefined') {
    this.config.only_defined_methods = false
  }

  for (let endpoint in this.config.endpoints) {
    this.rpcEndpoints.add(this.config.endpoints[endpoint])
  }

  debug('Jayeth server starting...')
  debug('Loaded config: %O', config)
  var self = this

  const methods = {
    jayeth_addRpcEndpoint: function (args, callback) {
      self.config.endpoints[args[0]] = { server: args[1], weight: args[2] }
      self.rpcEndpoints.add(self.config.endpoints[args[0]])
      callback(null, true)
    }
  }

  this.fallback = function (endpoint, method, params) {
    return new Jayson.Method(function (args, done) {
      Jayson.client.http(endpoint).request(method, params, function (err, response) {
        if (self.config.fallback && (err || response.error)) {
          debug('Error encountered, fallback enabled, falling back to %s', self.config.endpoints[self.config.fallback].server)
          Jayson.client.http(self.config.endpoints[self.config.fallback].server).request(method, params, function (err2, response2) {
            response2.result ? done(null, response2.result) : done(response2.error, null)
          })
        } else {
          response.result ? done(null, response.result) : done(response.error, null)
        }
      })
    })
  }

  this.server = Jayson.server(methods, {
    router: function (method, params) {
      debug('router %O, %O', method, params)

      // regular by-name routing first, jayeth_ methods will be triggered here
      if (typeof (this._methods[method]) === 'object') return this._methods[method]

      // check if the method exists in the config.methods
      if (typeof self.config.methods !== 'undefined' && self.config.methods.hasOwnProperty(method)) {
        // route to the defined endpoint
        return self.fallback(self.config.endpoints[config.methods[method]].server, method, params)
      } else {
        // since we did not find any configured methods and the only-defined-methods is true, we return
        if (self.config['only-defined-methods']) { return }

        // no method found, check for default behaviour
        switch (self.config.default) {
          case 'none':
            return
          case 'round-robin':
            let assignedEndpoint = self.rpcEndpoints.get().server
            debug('case: round-robin, assigned endpoint: %s', assignedEndpoint)
            return self.fallback(assignedEndpoint, method, params)

          case 'all':
            debug('case: all, requesting %s endpoints', Object.keys(self.config.endpoints).length)
            let jobs = []
            for (let endpoint in self.config.endpoints) {
              let job = function (callback) {
                Jayson.client.http(self.config.endpoints[endpoint].server).request(method, params, function (err, response) {
                  callback(err, response)
                })
              }
              jobs.push(job)
            }
            return new Jayson.Method(function (args, done) {
              async.parallel(async.reflectAll(jobs),
                function (err, results) {
                  done(err, results)
                })
            })
          default:
            debug('case: default, requesting %s', self.config.endpoints[config.default].server)
            return self.fallback(self.config.endpoints[config.default].server, method, params)
        }
      }
    }
  })
}

jayeth.prototype.listen = function () {
  this.server.http().listen(this.config.port)
  debug('Server listening on %s', this.config.port)
}

jayeth.prototype.close = function () {
  this.server.http().close()
  debug('Server closed')
}

module.exports = jayeth
