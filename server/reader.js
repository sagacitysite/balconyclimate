var _ = require("underscore");
var Promise = require("bluebird");
var Web3 = require("web3");
var rp = require("request-promise");
const Express = require('express');
const app = Express();

//import { default as contract } from 'truffle-contract'
//import measurement_artifacts from '../build/contracts/Measurements.json'
var contract = require('truffle-contract');
var measurement_artifacts = require('./build/contracts/Measurements.json');
var Measurements = contract(measurement_artifacts);

//console.log(measurement_artifacts);

var rpcAddress = "http://localhost:8546";
Measurements.setProvider(new Web3.providers.HttpProvider(rpcAddress));
var measurementsPromise = Measurements.deployed();

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

function getListAsync(listPromise,
                      getNumElementsFuncName, getElementFuncName,
                      mapElement) {
  var numElementsPromise = listPromise.
    then(function(list) { return list[getNumElementsFuncName].call(); }).
    then(function(num_elements) { return num_elements.toNumber(); });

  return Promise.join(listPromise, numElementsPromise).spread(function(list, num_elements) {
    console.log(num_elements);
    
    var getElementPromises = [];
    for(var i = 0; i < num_elements; ++i)
      getElementPromises.push(list[getElementFuncName].call(i));
    
    console.log(getElementPromises.length);
    
    return Promise.map(getElementPromises, mapElement);
  });
}

function mapMeasurement(m) {
    return Promise.resolve(m);
  /*return Promise.props({
    assessment: e[0].toNumber(),
    comment: e[1]
  });*/
}

app.get('/last', function(req, res) {
    var externalsQueryPromise =
        rp('http://api.luftdaten.info/static/v1/data.json').
        then((externals) => _.uniq(JSON.parse(externals), (external) => external.id));
    var blockchainQueryPromise =
        getListAsync(measurementsPromise, 'getNumLast', 'getLast',
                     mapMeasurement);

    externalsQueryPromise.then(res.send.bind(res));
});

app.get('/history/:id', function(req, res) {
    
});

app.listen(3000, function () {
  console.log('Server listening on port 3000!')
});
