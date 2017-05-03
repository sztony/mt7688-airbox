import React, { Component } from 'react';
// import { polyfill } from 'es6-promise';
import fetch from 'isomorphic-fetch';
import logo from './logo.svg';
import './App.css';
import { Button } from 'react-bootstrap';

class App extends Component {

  constructor() {
    super();
    this.state = {
      "sensors": {
        "humidity": undefined,
        "temperature": undefined,
        "pmat25": undefined,
        "ppm": undefined
      },
      "air_conditioners": [
        {},
        {},
        {},
        {},
        {}
      ],
      "settings": {
        "sensor_addr": "http://192.168.1.115:8080",
        "air_control_addr": "http://192.168.1.116:8080",
        "dehumidifier_addr": undefined
      },
      "highLowRules": [
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
      ]
    };

    this.getSensorData = this.getSensorData.bind(this);
    this.getTemperature = this.getTemperature.bind(this);
    this.getPowerState = this.getPowerState.bind(this);
  }

  // get sensor data
  getSensorData() {
    fetch(this.state.settings.sensor_addr + '/sensors').then((response) => {
      if (response.status >= 400) {
        throw new Error("Bad response from server");
      }
      return response.json();
    }).then((json) => {
      console.log(json);
      this.setState({
        "sensors": json
      });
    });
  };

  // get AC temperature
  getTemperature(slaveAddr) {
    console.log(new Date() + ' call ' + slaveAddr);
    fetch(this.state.settings.air_control_addr + '/' + slaveAddr + '/0').then((response) => {
      if (response.status >= 400) {
        throw new Error("Bad response from server");
      }
      return response.json();
    }).then((json) => {
      console.log('air_conditioner[' + slaveAddr + '].temperature = ' + json.value);
      let air_conditioners = {};
      Object.assign(air_conditioners, this.state.air_conditioners);
      air_conditioners[slaveAddr - 1]["temperature"] = json.value;
      this.setState({
        "air_conditioners": air_conditioners
      });
    });
  };

  // get AC power state
  getPowerState(slaveAddr) {
    console.log(new Date() + ' call ' + slaveAddr);
    fetch(this.state.settings.air_control_addr + '/' + slaveAddr + '/20').then((response) => {
      if (response.status >= 400) {
        throw new Error("Bad response from server");
      }
      return response.json();
    }).then((json) => {
      console.log('air_conditioner[' + slaveAddr + '].power = ' + json.value);
      let air_conditioners = {};
      Object.assign(air_conditioners, this.state.air_conditioners);
      air_conditioners[slaveAddr - 1]["power"] = json.value;
      this.setState({
        "air_conditioners": air_conditioners
      });
    });
  };

  // change AC power state
  changePowerState(slaveAddr, value) {
    console.log(new Date() + ' call ' + slaveAddr);

    let params = {
      'method': 'PUT',
      'headers': {
        'Accept': 'application/json;charset=UTF-8',
        'Content-Type': 'application/json;charset=UTF-8'
      },
      'body': JSON.stringify({ 'value': value })
    };

    fetch(this.state.settings.air_control_addr + '/' + slaveAddr + '/20', params).then((response) => {
      if (response.status >= 400) {
        throw new Error("Bad response from server");
      }
      return response.json();
    }).then((json) => {
      console.log('air_conditioner[' + slaveAddr + '].power = ' + json.value);
    });
  };

  componentDidMount() {
    setInterval(() => {

      this.getSensorData();

      setTimeout(() => { return this.getTemperature(1); }, 1000);
      setTimeout(() => { return this.getTemperature(2); }, 2000);
      setTimeout(() => { return this.getTemperature(3); }, 3000);
      setTimeout(() => { return this.getTemperature(4); }, 4000);
      setTimeout(() => { return this.getTemperature(5); }, 5000);

      setTimeout(() => { return this.getPowerState(1); }, 6000);
      setTimeout(() => { return this.getPowerState(2); }, 7000);
      setTimeout(() => { return this.getPowerState(3); }, 8000);
      setTimeout(() => { return this.getPowerState(4); }, 9000);
      setTimeout(() => { return this.getPowerState(5); }, 10000);

    }, 10000);
  }

  render() {
    let { humidity, temperature, pmat25, ppm } = this.state.sensors;

    let air = [];
    for (let i = 0; i < 5; i++) {
      let p = this.state.air_conditioners[i].power;
      let powerOffStyle = "default";
      let powerOnStyle = "default";
      if (p === 0) {
        powerOffStyle = "primary";
      } else if (p === 1) {
        powerOnStyle = "primary";
      }

      air.push((
        <div key={'AC' + i}>
          ID: {i + 1} Temperature: {this.state.air_conditioners[i].temperature} &deg;C
          {' '}
          <Button bsStyle={powerOffStyle} onClick={() => this.changePowerState(i + 1, 0)}>OFF</Button>
          <Button bsStyle={powerOnStyle} onClick={() => this.changePowerState(i + 1, 1)}>ON</Button>
        </div>
      ));
    }

    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Air Box</h2>
        </div>
        
        <h1>Humidity: {humidity} %</h1>
        <h1>Temperature: {temperature} &deg;C</h1>
        <h1>PM2.5: {pmat25} ug/m3</h1>
        <h1>Liquefied Petroleum Gas: {ppm} ppm</h1>

        <hr />
        {air}
        <hr />
      </div>
    );
  }
}

export default App;
