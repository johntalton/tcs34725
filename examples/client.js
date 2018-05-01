"use stict";

const Convert = require('color-convert');


const Config = require('./client-config.js');
const Store = require('./client-store.js');
const Device = require('./client-device.js');

const colurs = {
  '200': { name: 'red',          bg: 41  },
  '020': { name: 'green',        bg: 42  },
  '220': { name: 'yellow',       bg: 43  },
  '002': { name: 'blue',         bg: 44  },
  '202': { name: 'magenta',      bg: 45  },
  '022': { name: 'cyan',         bg: 46  },
  '222': { name: 'lightgrey',    bg: 47  },
  '111': { name: 'darkgrey',     bg: 100 },
  '100': { name: 'lightred',     bg: 101 },
  '010': { name: 'lightgreen',   bg: 102 },
  '110': { name: 'lightyellow',  bg: 103 },
  '001': { name: 'lightblue',    bg: 104 },
  '101': { name: 'lightmagenta', bg: 105 },
  '011': { name: 'lightcyan',    bg: 106 }
};



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
    return Device.setupDeviceWithRetry(device).then(() => {
      Device.on(device, 'data', (data, result) => dataHandler(config, device, data, result));
      Device.on(device, 'step', (threshold, direction, rawC) => stepHandler(config, device, threshold, direction, rawC));

      if(config.mqtt.client.connected){ return Device.startDevice(device); }
    });
  }));
}

function dataHandler(config, device, data, result) {
  const bgColor = '\x1b[' + (Convert.rgb.ansi16(data.rgb.r, data.rgb.g, data.rgb.b) + 10) + 'm';
  const resetColor = '\x1b[0m';
  console.log('\t"' + device.name + '"', data.raw.c, 'rgb:', bgColor + JSON.stringify(data.rgb) + resetColor, 'lux:', Math.trunc(data.lux, 2));
  //console.log(data);

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
}).catch(e => {
  console.log('top level error', e);
});

console.log('and we are off...');
