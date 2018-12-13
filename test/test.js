/* global describe it, before, after */

var assert = require('assert')
var jayson = require('jayson')
var Jayeth = require('../index.js')
const async = require('async')

require('./test-server.js').startServer(3012, 'jayeth:test_server_1')
require('./test-server.js').startServer(3013, 'jayeth:test_server_2')

describe('Jayeth RPC server', function () {
  this.timeout(15000)
  var serverUrl

  describe('test config 1: round-robin endabled, endpoints and methods configured', function () {
    var jayeth

    before(function () {
      // starting jayeth server
      var config = require('./configs/1.json')
      jayeth = new Jayeth(config)
      jayeth.listen()
      serverUrl = 'http://localhost:' + config.port
    })

    it('should route add to faux_server_1', function (done) {
      jayson.client.http(serverUrl).request('add', null, function (err, response) {
        if (err || response.error) throw (err || response.error)
        // add should route to faux_server_1
        assert(response.result === 'jayeth:test_server_1')
        done()
      })
    })

    it('should route substract to faux_server_2', function (done) {
      jayson.client.http(serverUrl).request('substract', null, function (err, response) {
        if (err || response.error) throw (err || response.error)
        assert(response.result === 'jayeth:test_server_2')
        done()
      })
    })

    it('should round robin requests between two servers equally for 100 simultaneous requests', function (done) {
      var server1Requests = 0
      var server2Requests = 0
      var responses = []

      for (var i = 100 - 1; i >= 0; i--) {
        jayson.client.http(serverUrl).request('multiply', null, function (err, response) {
          if (err || response.error) throw (err || response.error)
          responses.push(response.result)
          if (response.result === 'jayeth:test_server_1') ++server1Requests
          if (response.result === 'jayeth:test_server_2') ++server2Requests
        })
      };

      // give it some time to finish
      setTimeout(function () {
        assert(server1Requests === 50)
        assert(server2Requests === 50)
        done()
      }, 1000)
    })

    it('should return correct error code when provided undefined method', function (done) {
      jayson.client.http(serverUrl).request('unknown', null, 'xxx', function (err, response) {
        if (err) throw (err)
        assert(response.error.code === -32601)
        done()
      })
    })
    after(function () {
      jayeth.close()
    })
  })
  describe('test config 2: minimal configuration', function () {
    var jayeth
    before(function () {
      // starting jayeth server
      var config = require('./configs/2.json')
      jayeth = new Jayeth(config)
      jayeth.listen()
      serverUrl = 'http://localhost:' + config.port
    })
    it('should work', function (done) {
      jayson.client.http(serverUrl).request('add', null, function (err, response) {
        if (err || response.error) throw (err || response.error)
        // add should route to faux_server_1
        assert(response.result === 'jayeth:test_server_1')
        done()
      })
    })
    after(function () {
      jayeth.close()
    })
  })
  describe('test config 3: default:"all" configuration, dynamically adding routes', function () {
    var jayeth
    before(function () {
      // starting jayeth server
      var config = require('./configs/3.json')
      jayeth = new Jayeth(config)
      jayeth.listen()
      serverUrl = 'http://localhost:' + config.port
    })
    it('should get a response object from both servers', function (done) {
      jayson.client.http(serverUrl).request('add', null, function (err, response) {
        if (err || response.error) throw (err || response.error)
        assert(response.result.length === 2)
        done()
      })
    })
    it('should add a new rpc endpoint', function (done) {
      jayson.client.http(serverUrl).request('jayeth_addRpcEndpoint', ['a_name', 'http://this.will.not.work', '1'], function (err, response) {
        if (err || response.error) throw (err || response.error)
        assert(response.result)
        done()
      })
    })
    it('should get a response object from three servers', function (done) {
      jayson.client.http(serverUrl).request('add', null, function (err, response) {
        if (err || response.error) throw (err || response.error)
        assert(response.result.length === 3)
        done()
      })
    })
    after(function () {
      jayeth.close()
    })
  })
  describe('test config 4: "only-defined-methods":true configuration', function () {
    var jayeth
    before(function () {
      // starting jayeth server
      var config = require('./configs/4.json')
      jayeth = new Jayeth(config)
      jayeth.listen()
      serverUrl = 'http://localhost:' + config.port
    })
    it('should respond with method not found although test-server implements this method', function (done) {
      jayson.client.http(serverUrl).request('multiply', null, function (err, response) {
        if (err) throw (err)
        assert(response.error.code === -32601)
        done()
      })
    })
    after(function () {
      jayeth.close()
    })
  })
  describe('test config 5: two servers, round-robin with weight -1', function () {
    var jayeth
    var config
    before(function () {
      // starting jayeth server
      config = require('./configs/5.json')
      jayeth = new Jayeth(config)
      jayeth.listen()
      serverUrl = 'http://localhost:' + config.port
    })
    it('should not round-robin on servers with weight < 0', function (done) {
      let jobs = []
      for (var i = 100 - 1; i >= 0; i--) {
        let job = function (callback) {
          jayson.client.http(serverUrl).request('add', null, function (err, response) {
            callback(err, response)
          })
        }
        jobs.push(job)
      }

      async.parallel(async.reflectAll(jobs),
        function (err, results) {
          if (err) { throw (err) }
          for (let result in results) {
            if (results[result].value.result !== 'jayeth:test_server_1') {
              throw (new Error())
            }
          }
          done()
        })
    })
    after(function () {
      jayeth.close()
    })
  })
  describe('test config 6: two servers, one not reachable, fallback enabled', function () {
    var jayeth
    var config
    before(function () {
      // starting jayeth server
      config = require('./configs/6.json')
      jayeth = new Jayeth(config)
      jayeth.listen()
      serverUrl = 'http://localhost:' + config.port
    })
    it('should fallback correctly', function (done) {
      jayson.client.http(serverUrl).request('add', null, function (err, response) {
        if (err) throw (err)
        assert(response.result === 'jayeth:test_server_2')
        done()
      })
    })
    after(function () {
      jayeth.close()
    })
  })
})
