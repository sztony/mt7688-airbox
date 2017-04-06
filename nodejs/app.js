//
// AirBox on MT7688
//
// To enable ECMAScript 2015 features, use the following command to run:
//   node --harmony app.js
//
// Author: Yu-Hua Chang
//
"use strict";
process.title = 'node-app';

// Settings
const HTTP_PORT = 8080;

// Import libraries
const http = require('http');
const url = require('url');
const SerialPort = require("serialport").SerialPort;

////////////////////////////////////////////////////////////////////////////////
// sensor values
let sensors = {
  "humidity": undefined,
  "temperature": undefined,
  "pmat25": undefined,
  "ppm": undefined
};

// settings
let settings = {
  "air_conditioner_addr": "http://192.168.1.116:8080",
  "dehumidifier_addr": undefined
};

// high low rule settings
let highLowRules = [
  {
    "sensor": "temperature",
    "high_value": 28,
    "low_value": 24,
    "target": "air_conditioner_addr"
  },
  {
    "sensor": "humidity",
    "high_value": 65,
    "low_value": 55,
    "target": "dehumidifier_addr"
  }
];

////////////////////////////////////////////////////////////////////////////////
// open serial port to MCU
const serial = new SerialPort("/dev/ttyS0", {
  baudrate: 57600
});

serial.on('error', (err) => {
  console.log('SerialPort Error: ', err.message);
})

////////////////////////////////////////////////////////////////////////////////
// RESTful web services
const server = http.createServer((request, response) => {

  // retrieve request header, method, url, and body.
  let headers = request.headers;
  let method = request.method;
  let url = request.url;
  let body = [];
  request.on('error', function(err) {
    console.error(err);
  }).on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();

    // prepare the information we need.
    let resourceType = undefined;

    // retrieve slave address and target register address from url
    let req = request.url.split('/');
    if (req.length == 2) {
      resourceType = req[1].trim();
    }

    let notFound = false;
    if (resourceType === undefined) {
      notFound = true;
    } else {

      // determine function by request method.
      if (request.method === 'GET') {
        console.log('read resource ' + resourceType);

        // return resource value
        if (resourceType === 'sensors') {
          response.setHeader("Access-Control-Allow-Origin", "*");
          response.writeHead(200, {'Content-Type': 'application/json'});
          response.write(JSON.stringify(sensors));
          response.end();
        } else if (resourceType === 'settings') {
          response.setHeader("Access-Control-Allow-Origin", "*");
          response.writeHead(200, {'Content-Type': 'application/json'});
          response.write(JSON.stringify(settings));
          response.end();
        } else if (resourceType === 'highlow') {
          response.setHeader("Access-Control-Allow-Origin", "*");
          response.writeHead(200, {'Content-Type': 'application/json'});
          response.write(JSON.stringify(highLowRules));
          response.end();
        } else {
          notFound = true;
        }
      } else if (request.method === 'PUT') {
        console.log('write resource ' + resourceType);

        // write resource value
        if (resourceType === 'settings') {
          settings = JSON.parse(body);
          response.setHeader("Access-Control-Allow-Origin", "*");
          response.writeHead(200, {'Content-Type': 'application/json'});
          response.write(JSON.stringify(settings));
          response.end();
        } else if (resourceType === 'highlow') {
          highLowRules = JSON.parse(body);
          response.setHeader("Access-Control-Allow-Origin", "*");
          response.writeHead(200, {'Content-Type': 'application/json'});
          response.write(JSON.stringify(highLowRules));
          response.end();
        } else {
          notFound = true;
        }
      }
    }
    
    if (notFound) {
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.writeHead(404, {'Content-Type': 'text/plain'});
      response.write('404 Not Found\n');
      response.end();
    }
  });
});

////////////////////////////////////////////////////////////////////////////////
// run server
serial.on('open', (err) => {
  if (err) {
    console.log('serial port opened has error:', err);
    return;
  }
  console.log('serial port opened.');

  // Listen http port.
  server.listen(HTTP_PORT, function(){
    console.log("%s HTTP Server listening on %s", new Date(), HTTP_PORT);
  });
});

////////////////////////////////////////////////////////////////////////////////
// process the response from MCU
serial.on('data', (data) => {
  
  // let value = '';
  // for (let i = 0; i < data.length; i++) {
  //   value += String.fromCharCode(data[i]);
  // }
  // console.log('>>' + value + '<<');
  let id = data[0];
  let value = (data[1] << 24 | data[2] << 16 | data[3] << 8 | data[4]) / 100.0;
  // console.log(id + ' -> ' + value);
  switch (id) {
    case 0:
      sensors.humidity = value;
      break;
    case 1:
      sensors.temperature = value;
      break;
    case 2:
      sensors.pmat25 = value;
      break;
    case 3:
      sensors.ppm = value;
      break;
  }
});

