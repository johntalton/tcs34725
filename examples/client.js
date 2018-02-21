'use stict';

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
  '011': { name: 'lightcyan',    bg: 106 },
  
};

function map(r, g, b) {
  const key = [Math.round(r * 2 + 0.5), Math.round(g * 2 + 0.5), Math.round(b * 2 + 0.5)].join('');

  return colurs[key];
}

function configureDevices(devices) {
  return Promise.all(devices.map(device => Device.setupDeviceWithRetry(device)));
}

Config.config('./client.json').then(config => {
  return Promise.resolve()
    .then(() => Store.make(config))
    .then(() => configureDevices(config.devices))
}).catch(e => {
  console.log('error', e);
});

console.log('and we are off...');
