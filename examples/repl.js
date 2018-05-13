"use stict";

const Repler = require('repler');
const rasbus = require('rasbus');

const { Tcs34725 } = require('../src/tcs34725.js');

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
    return state.tcs.setProfile({ powerOn: true, active: true, wait: false }).then(() => {
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
      integrationTimeMs: 24,
      wait: true,
      waitTimeMs: (2 * 1000),
      multiplier: 4,
      filtering: 30,
      interrupts: true,
      low: 280,
      high: 290
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
    return rasbus.byname('i2c-bus').init(1, 0x29).then(bus => {
      return Tcs34725.init(bus).then(tcs => {
        state.tcs = tcs;
      });
    });
  }
});

Repler.go({ autologoutMs: 10 * 1000 });
