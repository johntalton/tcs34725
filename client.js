'use stict';

const Gpio = require('onoff').Gpio;

const rasbus = require('rasbus');
const i2c = rasbus.i2c;
const Tcs34725 = require('./src/tcs34725.js');

function checkId(tcs) {
  // console.log('checkid: ' , tcs);
  return tcs.id().then(id => {
    console.log('Chip ID: 0x' + id.toString(16));
    if(id !== Tcs34725.CHIP_ID){ throw new Error('invalid/unknonw chip id: ' + id); }
    return tcs; // proxy
  });
}

function setProfile(tcs) {
  return tcs.setProfile({
    powerOn: true,
    active: true,
    integrationTimeMs: 240,

    interrupts: true, // filter:30 @ waitTime:2s -> interupts only once 1min
    filtering: true, // 30
    high: 290,
    low: 285,

    wait: true,
    waitTimeMs: 1 * 1000,

    multiplyer: 60 // 1 4 16 60 gain
  }).then(() => tcs); // proxy
}

function poll(bus, tcs) {
  // console.log(bus, tcs);
  tcs.data().then(data => {
    console.log(data);
  }).catch(e => { console.log('error', e); });
}

const led = new Gpio(13, 'out');
const int = new Gpio(26, 'in', 'both');
int.watch((err, value) => {
  console.log('watch int: ', err, value);
});


i2c.init(1, Tcs34725.ADDRESS).then(bus => {
  return Tcs34725.init(bus)
    .then(checkId)
    .then(setProfile)
    .then(tcs => {
      const timer = setInterval(poll, 1000, bus, tcs);
      return timer;
    });
}).catch(e => {
  console.log('error', e);
});

