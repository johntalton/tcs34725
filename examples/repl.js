const i2c = require('i2c-bus');

const Repler = require('repler');
const { I2CAddressedBus } = require('@johntalton/and-other-delights');

const { Tcs34725 } = require('..');

Repler.addPrompt(state => 'tcs34725> ');

Repler.addCommand({
  name: 'id',
  valid: state => state.tcs !== undefined,
  callback: state => {
    return state.tcs.id().then(id => {
      console.log('Chip ID: 0x' + id.toString(16));
    });
  }
});


Repler.addCommand({
  name: 'on',
  valid: state => state.tcs !== undefined,
  callback: state => {
    return state.tcs.setProfile({
        powerOn: true,
        threshold: { low: 0, high: 100 }
      })
      .then(() => {
        console.log('on (power / active / no-wait)');
      });
  }
});

Repler.addCommand({
  name: 'off',
  valid: state => state.tcs !== undefined,
  callback: state => {
    return state.tcs.setProfile({ powerOn: false }).then(() => {
      console.log('off (power off)');
    });
  }
});

Repler.addCommand({
  name: 'clearInterrupt',
  valid: state => state.tcs !== undefined,
  callback: state => {
    return state.tcs.clearInterrupt().then(() => {
      console.log('interrupt cleared');
    });
  }
});

Repler.addCommand({
  name: 'normal',
  valid: state => state.tcs !== undefined,
  callback: state => {
    return state.tcs.setProfile({
      powerOn: true,
      active: true,
      wait: true,
      interrupts: true,

      integrationTimeMs: 240,
      waitTimeMs: 7 * 1000,

      gain: 60,

      filtering: 1,
      low: 0,
      high: 100

    }).then(() => {
      console.log('profile set to continous converstion mode');
    });
  }
});

Repler.addCommand({
  name: 'profile',
  valid: state => state.tcs !== undefined,
  callback: state => {
    return state.tcs.profile().then(profile => {
      console.log('chip profile: ', profile);
    });
  }
});

Repler.addCommand({
  name: 'init',
  valid: state => state.tcs === undefined,
  callback: state => {
    // const parts = state.line.trim().split(' ').slice(1);
    const busNumber = 1;
    const busAddress = 0x29;

    return i2c.openPromisified(busNumber)
      .then(bus => new I2CAddressedBus(bus, busAddress))
      .then(bus => Tcs34725.init(bus))
      .then(tcs => { state.tcs = tcs; });
  }
});

Repler.addCommand({
  name: 'data',
  valid: state => state.tcs !== undefined,
  callback: state => {
    return state.tcs.data().then(data => {
      console.log(data);
    });
  }
});


Repler.go({ autologoutMs: 30 * 1000 });
