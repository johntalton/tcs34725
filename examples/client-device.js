"use strict";

const Gpio = require('onoff').Gpio;

const rasbus = require('rasbus');
const i2c = rasbus.i2c;

const Tcs34725 = require('../src/tcs34725.js');

class Device {
  static setupDeviceWithRetry(config) {
    return Device.setupDevice(config)
      .then(() => Device.configureDevice(config))
      .catch(err => {
        console.log('initial setup failed, start retry', config.name, err.message);
        config.retrytimer = setInterval(Device.retrySetup, config.retryIntervalMs, config);
      });
  }

  static setupDevice(config) {
    console.log('setupDevice', config.name);
    return rasbus.byname(config.bus.driver).init(...config.bus.id).then(bus => {
      console.log('bus up', config.name);
      config.bus.client = bus;
      return Tcs34725.init(bus).then(tcs => {
        console.log('validating chip ID');
        return tcs.id()
          .then(id => {
            if(id !== Tcs34725.CHIP_ID){ throw Error('invalid/unknonw chip id: ' + id); }
          })
          .then(() => {
            config.client = tcs;
            Device.setupLED(config);
            Device.setupInterrupt(config);

	    console.log('device up', config.name);
          });
      });
    });
  }

  static configureDevice(config) {
    console.log('setting profile', config.name);
    return config.client.setProfile(config.profile).then(() => {
      if(config.clearIntOnStart) { console.log('clearing interrupt'); return config.client.clearInterrupt(); }
    });
  }

  static retrySetup(config) {
    console.log('retry setup');
    Device.setupDevice(config)
      .catch(e => {

        config.bus.client.close();
        config.bus.client = undefined;
        config.client = undefined;
        console.log('retry setup failed', config.name, e.message);
      });
  }

  static startDevice(config) {
    console.log('start device', config.name);
    if(config.client === undefined) { return; }
    Device.setupPoller(config);
    Device.setupStepper(config);
  }

  static stopDevice(config) {
    console.log('stop device', config.name);
    if(config.client === undefined) { return; }
    clearInterval(config.poll.timer);
    
    if(config.interrupt == undefined) { return; }
    config.interrupt.client.unwatch(Device.watchInt);
  }

  static setupPoller(config) {
    if(config.poll === undefined) { return; }
    if(config.poll === false) { return }
    config.poll.timer = setInterval(Device.poll, config.poll.pollIntervalMs, config);
  }
  
  static setupStepper(config) {
    if(config.step === undefined) { return; }
    if(config.step === false) { return }

    if(config.interrupt.client === undefined) {
      console.log('interrupt not configured');
      return;
    }
   
    config.interrupt.client.watch(Device.watchInt);
  }

  static watchInt(err, value) {
    console.log('-----------> watch int: ', err, value);
  }

  static poll(config) {
    let steps = Promise.resolve({});

    if(config.poll.status && !config.poll.profile) {
      steps = steps.then(result => config.client.status()
          .then(s => { result.valid = s.availd; result.thresholdViolation = s.aint; return result; })
          .catch(e => { console.log('statsu poll failed', config.name, e); })
        );
    }
    if(config.poll.profile) { 
      steps = steps.then(result => config.client.profile()
          .then(p => { result = p; return result; })
          .catch(e => { console.log('profile poll failed', config.name, e); })
        );
    }

    steps.then(result => {
      if((result.valid !== undefined) && !result.valid) {
        console.log('data integration not completed / not ready', config.name);
        return;
      }

      if(result.thresholdViolation !== undefined) {
        console.log('polled interrupt value', result.thresholdViolation);
        // TODO software-interrupt inmpmentation to wire back to our interrupt.client impl
      }


      if(config.poll.skipData) { return; }

      return config.client.data().then(data => {
        console.log(config.name, data);
        return;
      });
    })
    .catch(e => { console.log('error', e); });
  }




  // --------------------------------------------------------------------------

  static setupLED(config) {
    config.led.client = new Gpio(config.led.gpio, 'out');
  }

  static setupInterrupt(config) {
    config.interrupt.client = new Gpio(config.interrupt.gpio, 'in', 'both', { activeLow: true });
  }
}

module.exports = Device;
