"use strict";

const EventEmitter = require('events');

const mqtt = require('mqtt');

class Store {
  static make(config) {
    if(config.mqtt.url === undefined) { return Promise.reject(Error('invalid mqtturl')); }

    const client = mqtt.connect(config.mqtt.url, { reconnectPeriod: config.mqtt.reconnectMs });
    
    client.on('connect', () => { config.mqtt.emitter.emit('up'); });
    client.on('reconnect', () => { });
    client.on('close', () => { });
    client.on('offline', () => { config.mqtt.emitter.emit('down'); });
    client.on('error', (error) => { console.log(error); process.exit(-1); });

    config.mqtt.emitter = new EventEmitter();
    config.mqtt.client = client;
    return Promise.resolve(client);
  }

  static on(config, event, cb) {
    return config.mqtt.emitter.on(event, cb);
  }

  static insert(config, device, results) {
    const topic = 'sensor/light';
    const payload = {
      device: device.name,
      results: results
    };

    return new Promise((resolve, reject) => {
      config.mqtt.client.publish(topic, JSON.stringify(payload));
    });
  }
}

module.exports = Store;
