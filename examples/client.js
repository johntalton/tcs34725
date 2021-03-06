
const Convert = require('color-convert');

const Config = require('./client-config.js');
const Store = require('./client-store.js');
const Device = require('./client-device.js');


function start(config) {
  console.log('Store Up: start all connected devices');
  config.devices.forEach(d => Device.startDevice(d));
}

function stop(config) {
  console.log('Store Down: stop all connected devices');
  config.devices.forEach(d => Device.stopDevice(d));
}

function configureStore(config) {
  return Store.make(config).then(() => {
    Store.on(config, 'up', () => start(config));
    Store.on(config, 'down', () => stop(config));
    return config;
  });
}

function dataHandler(config, device, data, result) {
  const bgColor256 = '\u001b[48;5;' + Convert.rgb.ansi256([data.rgb.r, data.rgb.g, data.rgb.b]) + 'm';
  const resetColor = '\x1b[0m';
  console.log(new Date(data.time).toISOString(), '\t"' + device.name + '": Clear:', data.raw.c, 'rgb:', bgColor256 + JSON.stringify(data.rgb) + resetColor, 'lux:', Math.trunc(data.lux, 2));

  // todo await?
  Store.insert(config, device, data)
    .catch(e => { console.log('storage error', device.name, e); });
}

function stepHandler(config, device, threshold, direction, rawC, time) {
  console.log(new Date(time).toISOString(), '\t"' + device.name + '": Clear:', rawC, direction > 0 ? '\u21E7' : '\u21E9', 'to', threshold.low, '-', threshold.high);

  const data = {
    name: config.name,
    threshold: threshold,
    direction: direction,
    time: time
  };

  // todo await
  Store.insertStep(config, device, data)
    .catch(e => { console.log('storage error', device.name, e); });
}

function configureDevices(config) {
  return Promise.all(config.devices.map(device => {
    // if we aren't active, just skip all together
    if(!device.active) {
      console.log('Skip inactive device:', device.name);
      return config;
    }

    return Device.setupDeviceWithRetry(device).then(() => {
      Device.on(device, 'data', (data, result) => dataHandler(config, device, data, result));
      Device.on(device, 'step', (threshold, direction, rawC, time) => stepHandler(config, device, threshold, direction, rawC, time));

      // todo startup hack for state, should move to state machine
      if(config.mqtt.client.connected) { return Device.startDevice(device); }
      return config;
    });
  }));
}

Config.config('./client.json')
  .then(configureStore)
  .then(configureDevices)
  .catch(e => {
    console.log('top level error', e);
  });
