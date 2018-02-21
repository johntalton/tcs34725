"use strict";

const mqtt = require('mqtt');

const Device = require('./client-device.js');

class Store {
  static make(config) {
    console.log('Store::make');
    if(config.mqtt.url === undefined) { return Promise.reject(Error('invalid mqtturl')); }

    const client = mqtt.connect(config.mqtt.url, { reconnectPeriod: config.mqtt.reconnectMs });
    
    client.on('connect', () => { console.log('Mqtt Up'); config.devices.forEach(d => Device.startDevice(d)); });
    client.on('reconnect', () => { });
    client.on('close', () => { });
    client.on('offline', () => { console.log('Mqtt Down'); config.devices.forEach(d => Device.stopDevice(d)); });
    client.on('error', (error) => { console.log(error); process.exit(-1); });

    config.mqtt.client = client;
    return Promise.resolve(client);
  }

  static insert(config, results) {
    const topic = 'sensor/light';
    const payload = results;

    return new Promise((resolve, reject) => {
      config.mqtt.client.publish(topic, JSON.stringify(payload));
    });
  }
}

module.exports = Store;
