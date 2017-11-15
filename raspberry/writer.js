var _ = require("lodash");
var Promise = require("bluebird");

var config = require('./'+process.argv[2]);

//import { default as contract } from 'truffle-contract'
//import measurements_artifacts from '../build/contracts/Measurements.json'
var contract = require('truffle-contract');
var measurement_artifacts = require('./build/contracts/Measurements.json');
var Measurements = contract(measurements_artifacts);

var BrowserWallet = require("./browser_wallet");
var browserWallet = new BrowserWallet(config.rpcAddress, config.privateKeyString, false);

Measurements.setProvider(browserWallet.web3.currentProvider);
var measurementsPromise = Measurements.deployed();

const Sensor = require('sds011-wrapper/wrapper.js');
const sensor = new Sensor("/dev/ttyUSB0"); // Use your system path of SDS011 sensor.



//console.log(config.latitude);
//console.log(process.argv[2]);
//console.log(config);

sensor
    .setReportingMode('active')
    .then(() => {
        console.log("Sensor is now working in active mode.");
        return sensor.setWorkingPeriod(60000); // Sensor will send data as soon as new data is available.
    })
    .then(() => {
        console.log("Working period set to 0 minutes.");
        console.log("\nSensor readings:");

        // Since working period was set to 0 and mode was set to active, 
        //this event will be emitted as soon as new data is received.
        sensor.on('measure', (data) => {
            
            
            //console.log(`[${new Date().toISOString()}] ${JSON.stringify(data)}`);
            var x = data["PM2.5"];
            var y = data["PM10"];
            
         
            var sensor_values_temp = [ { "id":1069255759,"value":x,"value_type":"temperature" } , 
                    { "id":1069255760,"value":y,"value_type":"humidity" } ];
            var sensor_values_pm = [ { "id":1069255759,"value":x,"value_type":"P1" } , 
                    { "id":1069255760,"value":y,"value_type":"P2" } ];
            
            // sensor types
            // "sensor_type":{"id":14,"name":"SDS011","manufacturer":"Nova Fitness"} // "pin":"1"
            // "sensor_type":{"id":17,"name":"BME280","manufacturer":"Bosch"} // "pin":"11"
            // "sensor_type":{"id":9,"name":"DHT22","manufacturer":"various"} // "pin":"7"
            // "sensor_type":{"id":1,"name":"PPD42NS","manufacturer":"Shinyei"} // "pin":"5"
            
            var now = new Date();
            var nowString = now.getFullYear() + '-' + now.getDate() + '-' + now.getDay() + ' ' + now.getHours() + ':' 
            + now.getMinutes() + ':' + now.getSeconds();
            
             var  myObjTemp = { "id":484914423,"sampling_rate":null,"timestamp":nowString,
                        "location": 
                        { "id":config.location_id,"latitude":config.latitude,"longitude":config.longitude,
                        "country":"DE" },
                        "sensor": { "id":3752,"pin":"7",
                        "sensor_type": { "id":9,"name":"DHT22","manufacturer":"various" } },
                        "sensordatavalues": sensor_values_temp };
                        
            var  myObjPM = { "id":484914423,"sampling_rate":null,"timestamp": nowString,
                        "location": 
                        { "id":config.location_id,"latitude":config.latitude,
                        "longitude":config.longitude,"country":"DE" },
                        "sensor": { "id":config.pm_sensor_id,"pin":"1",
                        "sensor_type": { "id":14,"name":"SDS011","manufacturer":"Nova Fitness" } },
                        "sensordatavalues": sensor_values_pm };
                        
           // console.log(`[${new Date().toISOString()}] ${JSON.stringify(data) }`);
           //  console.log(`[${new Date().toISOString()}] ${JSON.stringify(myObjPM) }`);
            console.log(JSON.stringify(myObjPM));
            
            // write to smart contract
            measurementsPromise.then(function(measurements) {
                browserWallet.callContractMethodAsync(measurements.push, JSON.stringify(myObjPM));
            });
        });
    });
