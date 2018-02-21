"use strict";

const EventEmitter = require('events');

const Gpio = require('onoff').Gpio;

const rasbus = require('rasbus');
const i2c = rasbus.i2c;

const Tcs34725 = require('../src/tcs34725.js');

class Device {
  static on(config, event, cb) {
    return config.emitter.on(event, cb);
  }

  static setupDeviceWithRetry(config) {
    return Device.setupDevice(config)
      .then(() => Device.configureDevice(config))
      .catch(err => {
        console.log('initial setup failed, start retry', config.name, err.message);
        config.retrytimer = setInterval(Device.retrySetup, config.retryIntervalMs, config);
      });
  }

  static setupDevice(config) {
    //console.log('setupDevice', config.name);
    if(config.emitter === undefined) { config.emitter = new EventEmitter(); }

    return rasbus.byname(config.bus.driver).init(...config.bus.id).then(bus => {
      config.bus.client = bus;
      return Tcs34725.init(bus).then(tcs => {
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
    //console.log('setting profile', config.name);
    return config.client.setProfile(config.profile).then(() => {
      if(config.clearIntOnStart) { console.log('clearing interrupt', config.name); return config.client.clearInterrupt(); }
    });
  }

  static cleanupDevice(config) {
    
    Device.stopDevice(config);

    config.bus.client.close();
    config.bus.client = undefined;
    config.client = undefined;
  }

  static retrySetup(config) {
    //console.log('retry setup');
    Device.setupDevice(config)
      .catch(e => {

        Device.cleanupDevice(config);

        console.log('retry setup failed', config.name, e.message);
      });
  }

  static startDevice(config) {
    //console.log('start device', config.name);
    if(config.client === undefined) { return; }
    Device.setupPoller(config);
    Device.setupStepper(config);
  }

  static stopDevice(config) {
    //console.log('stop device', config.name);
    if(config.client === undefined) { return; }
    if(config.poll) {
      clearInterval(config.poll.timer);
      config.poll.timer = undefined;
    }

    if(config.interrupt == undefined) { return; }
    config.interrupt.client.unwatch();
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
      console.log('interrupt not configured', config.name);
      return;
    }
   
    config.interrupt.client.watch((err, value) => Device.watchInt(config, err, value));
  }

  static watchInt(config, err, value) {
    if(err) {
      console.log('gpio interrupt error', config.name, err);
      // todo teardown client or just ignore, or what
      return;
    }

    Promise.all([
      config.client.threshold(),
      config.client.data()
    ])
    .then(([threshold, data]) => {      
      let direction = 0;
      if(data.raw.c > threshold.high) {
        direction = +1;
      }
      else if(data.raw.c < threshold.low) {
        direction = -1;
      }
      else { direction = 0; }

      //console.log('reconfigure thresholds', config.name, data.raw.c, threshold, direction);

      let first = Promise.resolve();
      let newt = threshold;
      if(direction !== 0) {
        const range = threshold.high - threshold.low;
        const step = direction * Math.trunc(range / 2);
        const low = threshold.low + step;
        const high = threshold.high + step;
        newt = { low: low, high: high };
        first = config.client.setThreshold(low, high);
      }
      else { console.log('direction Zero, odd as this is interrupt driven, quick mover?'); }

      return first.then(() => {
        config.emitter.emit('step', newt, direction);
        return config.client.clearInterrupt();
      });
    })
    .catch(e => {
      console.log('error in stepper', config.name, e);
    });
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
        //console.log('polled interrupt value', config.name, result.thresholdViolation);
        // TODO software-interrupt inmpmentation to wire back to our interrupt.client impl
      }

      if(config.poll.skipData) { return; }

      return config.client.data().then(data => {
        config.emitter.emit('data', data, result);
      });
    })
    .catch(e => { console.log('error', config.name, e); });
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
