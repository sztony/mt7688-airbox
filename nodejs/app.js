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

// Target AC ID
const ac = "1";

// Settings
const HTTP_PORT = 8080;

// Import libraries
const http = require('http');
const https = require("https");
const url = require('url');
const SerialPort = require("serialport").SerialPort;
const os = require('os');

////////////////////////////////////////////////////////////////////////////////
// sensor values
let sensors = {
  "humidity": undefined,
  "temperature": undefined,
  "pmat25": undefined,
  "ppm": undefined,
  "ac_temperature": undefined,
  "ac_power": undefined
};

let ac_ip = undefined;
let ac_power_switch = undefined;
let ac_high_watermark = undefined;

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
  server.listen(HTTP_PORT, () => {
    console.log("%s HTTP Server listening on %s", new Date(), HTTP_PORT);
  });
});

////////////////////////////////////////////////////////////////////////////////
// process the response from MCU
serial.on('data', (data) => {

  let voice_command = undefined;

  // read serial data
  let id = data[0];
  let value = (data[1] << 24 | data[2] << 16 | data[3] << 8 | data[4]) / 100.0;
  console.log(id + ' -> ' + value);
  switch (id) {
    case 0:
      if (value > 0 && value < 100) {
        sensors.humidity = value;
        post_mcs_cloud("humidity", value);
      }
      break;
    case 1:
      if (value > 0) {
        sensors.temperature = value;
        post_mcs_cloud("temperature", value);
      }
      break;
    case 2:
      sensors.pmat25 = value;
      post_mcs_cloud("pmat25", value);
      break;
    case 3:
      sensors.ppm = value;
      post_mcs_cloud("ppm", value);
      break;
    case 4:
      voice_command = value;
      console.log("command = " + voice_command);
      break;
  }

  if (voice_command) {
    // if we have voice command, follow the voice command
    if (voice_command === 19 || voice_command === 22) {
      post_mcs_cloud("ac_power_switch", 1);
    } else {
      post_mcs_cloud("ac_power_switch", 0);
    }
  }

});

////////////////////////////////////////////////////////////////////////////////
// Check cloud data
setInterval(() => {

  // read AC ip address from the cloud
  get_mcs_cloud("ac_ip", (value) => {
    // console.log("ac_ip = " + value);
    ac_ip = value;
  });

  // check if we have instruction from the cloud
  get_mcs_cloud("ac_power_switch", (value) => {
    // console.log("ac_power_switch = " + value);
    ac_power_switch = value;
  });

  // check high watermark
  get_mcs_cloud("ac_high_watermark", (value) => {
    // console.log("ac_high_watermark = " + value);
    ac_high_watermark = value;
  });

  console.log(
    " AC Temp = " + sensors.ac_temperature +
    " AC Power = " + sensors.ac_power +
    " ac_power_switch = " + ac_power_switch +
    " ac_high_watermark = " + ac_high_watermark);

  if (sensors.ac_power !== undefined && ac_power_switch !== undefined && sensors.ac_power != ac_power_switch) {
    console.log("******************************");
    console.log("** ac_power_switch = " + ac_power_switch);
    console.log("******************************");
    put_ac_data(ac, "20", ac_power_switch);
  }

  if (ac_high_watermark !== undefined && sensors.ac_temperature >= ac_high_watermark) {
    console.log("*************");
    console.log("** Auto ON **");
    console.log("*************");
    post_mcs_cloud("ac_power_switch", 1);
  }

}, 1000);

// Check AC data
setInterval(() => {
  // read AC temperature
  setTimeout(() => {
    get_ac_data(ac, "0", (value) => {
      // console.log("ac_temperature = " + value);
      sensors.ac_temperature = value;
      post_mcs_cloud("ac_temperature", value);
    });
  }, 1000);

  // read AC power status
  setTimeout(() => {
    get_ac_data(ac, "20", (value) => {
      if (value == 0 || value == 1) {
        // console.log("ac_power = " + value);
        sensors.ac_power = value;
        post_mcs_cloud("ac_power", value);
      }
    });
  },2000);

}, 2000);

////////////////////////////////////////////////////////////////////////////////
let post_mcs_cloud = (channelId, channelValue) => {
  let data = {
    "datapoints": [
      {"dataChnId": channelId, "values": {"value": channelValue}}
    ]
  };

  let options = {
    host: "api.mediatek.com",
    port: 443,
    path: "/mcs/v2/devices/DgnnBIRM/datapoints",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "deviceKey": "pL00OZpxxGZkH0Tw"
    }
  };

  let req = https.request(options, (res) => {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      // console.log('BODY: ' + chunk);
    });
  });

  req.on('error', (e) => {
    console.log('problem with request: ' + e.message);
  });

  req.write(JSON.stringify(data));
  req.end();
}

let get_mcs_cloud = (channelId, callback) => {
  let options = {
    host: "api.mediatek.com",
    port: 443,
    path: "/mcs/v2/devices/DgnnBIRM/datachannels/" + channelId + "/datapoints",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "deviceKey": "pL00OZpxxGZkH0Tw"
    }
  };

  let req = https.request(options, (res) => {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      // console.log('BODY: ' + chunk);
      let obj = JSON.parse(chunk);
      if (obj.dataChannels.length > 0 && obj.dataChannels[0].dataPoints.length > 0) {
        let value = obj.dataChannels[0].dataPoints[0].values.value;
        // console.log('value = ', value);
        callback(value);
      } else {
        console.log('BODY: ' + chunk);
      }
    });
  });

  req.on('error', (e) => {
    console.log('problem with request: ' + e.message);
  });

  req.end();
}

////////////////////////////////////////////////////////////////////////////////
let put_ac_data = (slaveAddr, registerAddr, registerValue) => {
  if (ac_ip === undefined) return;

  let data = {
    "value": registerValue
  };

  let options = {
    host: "" + ac_ip,
    port: 8080,
    path: "/" + slaveAddr + "/" + registerAddr,
    method: "PUT"
  };

  let req = http.request(options, (res) => {
    console.log('post_ac_data STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log('post_ac_data BODY: ' + chunk);
    });
  });

  req.on('error', (e) => {
    console.log('problem with request: ' + e.message);
  });

  req.write(JSON.stringify(data));
  req.end();
}

let get_ac_data = (slaveAddr, registerAddr, callback) => {
  if (ac_ip === undefined) return;

  let options = {
    host: "" + ac_ip,
    port: 8080,
    path: "/" + slaveAddr + "/" + registerAddr,
    method: "GET"
  };

  let req = http.request(options, (res) => {
    // console.log('get_ac_data STATUS: ' + res.statusCode);
    if (res.statusCode === 200) {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        // console.log('get_ac_data BODY: ' + chunk);
        let obj = JSON.parse(chunk);
        let value = obj.value;
        // console.log('value = ', value);
        callback(value);
      });
    }
  });

  req.on('error', (e) => {
    console.log('problem with request: ' + e.message);
  });

  req.end();
}

////////////////////////////////////////////////////////////////////////////////
// report ip address
let interfaces = os.networkInterfaces();
let ip_addr = "";
for (let k in interfaces) {
  for (let k2 in interfaces[k]) {
    let address = interfaces[k][k2];
    if (address.family === 'IPv4' && !address.internal && address.address !== "192.168.100.1") {
      ip_addr = address.address;
      break;
    }
  }
}
console.log('********************************');
console.log('ip address: ' + ip_addr);
console.log('********************************');
post_mcs_cloud("airbox_ip", ip_addr);