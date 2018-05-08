
const EventEmitter = require('events');

const mqtt = require('mqtt');

class Store {
  static make(config) {
    if(config.mqtt.url === undefined) { return Promise.reject(Error('invalid mqtturl')); }

    const client = mqtt.connect(config.mqtt.url, { reconnectPeriod: config.mqtt.reconnectMs });

    client.on('connect', () => { config.mqtt.emitter.emit('up'); });
    //client.on('reconnect', () => { });
    //client.on('close', () => { });
    client.on('offline', () => { config.mqtt.emitter.emit('down'); });
    client.on('error', (error) => { console.log(error); throw Error('mqtt error: ' + error.toString()) });

    config.mqtt.emitter = new EventEmitter();
    config.mqtt.client = client;
    return Promise.resolve(client);
  }

  static on(config, event, cb) {
    return config.mqtt.emitter.on(event, cb);
  }

  static insert(config, device, results) {
    const topic = 'sensor/light/data';
    const payload = {
      device: device.name,
      results: results
    };
    return Store._publish(config, topic, payload);
  }

  static insertStep(config, device, results) {
    const topic = 'sensor/light/step';
    const payload = results;
    return Store._publish(config, topic, payload);
  }

  static _publish(config, topic, payload) {
    return new Promise((resolve, reject) => {
      config.mqtt.client.publish(topic, JSON.stringify(payload), {}, err => {
        if(err) { reject(err); }
        resolve();
      });
    });
  }
}

module.exports = Store;
