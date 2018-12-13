[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![npm version](https://badge.fury.io/js/jayeth.svg)](https://badge.fury.io/js/jayeth)

# Jayeth

A highly experimental JSON RPC router/loadbalancer/aggregator server. Allows you to expose multiple JSON RPC services on one interface.

With Jayeth you can round-robin requests across multiple RPC servers, route requests per method, define a fallback server, or call a method on multiple server at the same time.

## But why?

While experimenting with JSON RPC ethereum clients, i found there are some things that seem nice to have:

* If my local ethereum node drops, automatically fallback RPC calls to Infura.
* Call specific RPC methods on specific ethereum clients (eg. automatically call parity_allTransactions on Parity node, clique_getSingers on Pantheon node without having to manage two different Web3.js instances)
* Possibility to loadbalance requests across multiple rpc nodes
* Call a RPC method on multiple nodes at the same time (helpful when comparing RPC responses on different ethereum client implementations)

Although my motivation for Jayeth came from using Ethereum JSON RPC, you can use it for any services exposing any JSON RPC interface.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Installing

Install Jayeth:

```
npm install jayeth
```

or if you want to develop Jayeth locally:

```
git clone https://github.com/DAPowerPlay/jayeth
cd jayeth
npm install
npm test
```

Use it:

```
const Jayeth = require('jayeth')

const config = {
  // port where jayeth server will listen
  "port": 3001,
  // in this example, for every 20 requests, 5 will go to rpc_server_1, 5 will go to rpc_server_2, 10 will go to rpc_server_3, none will go to rpc_server_4
  "endpoints": {
    "rpc_server_1": {
      "server": "http://localhost:3012",
      "weight": 5
    },
    "rpc_server_2": {
      "server": "http://localhost:3013",
      "weight": 5
    },
    "rpc_server_3": {
      "server": "http://localhost:3014",
      "weight": 10
    },
    "rpc_server_4": {
      "server": "http://localhost:3015",
      "weight": -1
    }
  },
  // if a client requests "add" method, the request will be routed explicitly to rpc_server_3, "substract" method to rpc_server_4
  "methods": {
    "add": "rpc_server_3",
    "substract": "rpc_server_4"
  },
  // requests to the jayeth will be round-robined across endpoints defined in config.endpoints
  "default": "round-robin",
  // if an error is encountered , jayeth will attempt to call the endpoint defined in "fallback"
  "fallback" : "rpc_server_4"
}

const jayeth = new Jayeth(config)

jayeth.listen()

// jayeth server is now available on port 3001.
// See /test folder for more configuration examples

```

## Running the tests

Tests are written in Mocha. Test script will also run standard.js style guide, linter, and formatter.

### Running tests

```
npm test
```

If standard.js is complaining about code formmating/style you can try to run:

```
npm run fix
```

### Debug

jayeth is using the debug module, set DEBUG environment variable to see the logs:

```
export DEBUG=jayeth:*
```

## Deployment

This is a highly experimental module, please read the source before running this in production. Tested only with http:// transport.

## Built With

* [jayson](https://www.npmjs.com/package/jayson) 
* [weighted-round-robin](https://www.npmjs.com/package/weighted-round-robin)
* [async](https://www.npmjs.com/package/async)

## Contributing

If you see anything, please raise an issue, or open a PR.

## License

```
Copyright 2018 Nikola Jokić

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```
