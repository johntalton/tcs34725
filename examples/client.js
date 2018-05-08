"use stict";

const Convert = require('color-convert');

const Config = require('./client-config.js');
const Store = require('./client-store.js');
const Device = require('./client-device.js');

function configureStore(config) {
  return Store.make(config).then(() => {
    Store.on(config, 'up', () => start(config));
    Store.on(config, 'down', () => stop(config));
  });
}

function start(config) {
  console.log('Store Up: start all connected devices');
  config.devices.forEach(d => Device.startDevice(d));
}

function stop(config) {
  console.log('Store Down: stop all connected devices');
  config.devices.forEach(d => Device.stopDevice(d));
}

function configureDevices(config) {
  return Promise.all(config.devices.map(device => {
    // if we aren't active, just skip all together
    if(!device.active) {
      console.log('Skip inactive device:', device.name);
      return Promise.resolve();
    }

    return Device.setupDeviceWithRetry(device).then(() => {
      Device.on(device, 'data', (data, result) => dataHandler(config, device, data, result));
      Device.on(device, 'step', (threshold, direction, rawC) => stepHandler(config, device, threshold, direction, rawC));

      // todo startup hack for state, should move to state machine
      if(config.mqtt.client.connected){ return Device.startDevice(device); }
    });
  }));
}

function dataHandler(config, device, data, result) {
  const bgColor = '\x1b[' + (Convert.rgb.ansi16(data.rgb.r, data.rgb.g, data.rgb.b) + 10) + 'm';
  const resetColor = '\x1b[0m';
  console.log('\t"' + device.name + '"', data.raw.c, 'rgb:', bgColor + JSON.stringify(data.rgb) + resetColor, 'lux:', Math.trunc(data.lux, 2));
  // console.log(data);

  Store.insert(config, device, data)
    .catch(e => { console.log('storage error', device.name, e); })
}

function stepHandler(config, device, threshold, direction, rawC) {
  console.log('\t"' + device.name + '"', rawC, (direction > 0) ? '\u21E7' : '\u21E9', 'to', threshold.low, '-', threshold.high);

  const data = {
    name: config.name,
    threshold: threshold,
    direction: direction
  };
  Store.insertStep(config, device, data)
    .catch(e => { console.log('storage error', device.name, e); })
}

Config.config('./client.json').then(config => {
  return Promise.resolve()
    .then(() => configureStore(config))
    .then(() => configureDevices(config))
//    .then(() => console.log(config.devices[1]))
}).catch(e => {
  console.log('top level error', e);
});

console.log('and we are off...');
