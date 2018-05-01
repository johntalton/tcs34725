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
      if(config.clearIntOnStart) {
        console.log('clearing interrupt on start', config.name);
        return config.client.clearInterrupt();
      }
    });
  }

  static cleanupDevice(config) {
    //
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

    Device.disableInterrupt(config);
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

    Device.enableInterrupt(config);
  }

  static watchInt(config, err, value) {
    if(err) {
      console.log('gpio interrupt error', config.name, err);
      // todo teardown client or just ignore, or what
      return;
    }

    //console.log('value', value);

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
        // this is the working range, not the configrued range
        // this allows the system to continue working as expected
        // even when the profile is being configured externaly.
        const range = threshold.high - threshold.low;

        if(config.step.jump) {
          const step = Math.trunc(range / 2);
          // todo, this should actaully follow the step sizes
          // that the existing auto step bellow uses.  this current
          // impl is more of a 'center' around using existing range
          // which is a bit odd.  But the goal is to not have to walk
          // the entire threshold steps then this is a solution
          newt = { low: data.raw.c - step, high: data.raw.c + step, touched: true };
        } else {
          // standard mode is to walk the theshold steps
          // in the direction of our target. Can be usefull
          // for clients that expect all ranges traversed
          // (some client that have longer running times
          // - like day cycles - may not have been programed
          // to expect "jumps" in the ranges and thus this
          // compensates for that)
          const step = direction * Math.trunc(range / 2);
          const low = threshold.low + step;
          const high = threshold.high + step;
          newt = { low: low, high: high, touched: true };
        }

        // should be handled by above algos in smarter way, good safety
        if(newt.low < 0) { newt.low = 0; }
        if(newt.high < 0) { newt.low = 0; }
        if(newt.high > 0xFFFF) { newt.low = 0xFFFF; } // todo max thresh value

        // make fisrt our set call
        first = config.client.setThreshold(newt.low, newt.high);
      }
      else { console.log('direction Zero, odd as this is interrupt driven, quick mover?'); }

      // after that, we just emit the change and clear
      return first.then(() => {
        config.emitter.emit('step', newt, direction, data.raw.c);
        return config.client.clearInterrupt();
      });
    })
    .catch(e => {
      console.log('error in stepper', config.name, e);
    });
  }

  static poll(config) {
    let steps = Promise.resolve({});

    // if cycle multiplier on poll is enabled do that
    // false | array
    /*if(config.poll.cycleMultiplyer !== false) {
      const knownM = [1, 4, 16, 16]; // todo
      if(config.poll.lastMultiplierIndex === undefined) { config.poll.lastMultiplierIndex = 0; }
      const newM = knownM[config.poll.lastMultiplierIndex];
      config.poll.lastMultiplierIndex += 1;
      if(config.poll.lastMultiplierIndex >= knownM.length) { config.poll.lastMultiplierIndex = 0; }
      const cycleprofile = { ...config.profile, multiplier: newM };
      steps = steps.then(result => config.client.setProfile(cycleprofile));
    }*/

    // if status polling enabled do that first (skip if profile as it is included there)
    if(config.poll.status && !config.poll.profile) {
      steps = steps.then(result => config.client.status()
          .then(s => { result.valid = s.availd; result.thresholdViolation = s.aint; return result; })
          .catch(e => { console.log('statsu poll failed', config.name, e); })
        );
    }

    // if profile polling is enabled, do that now
    if(config.poll.profile) {
      steps = steps.then(result => config.client.profile()
          .then(p => { result = p; return result; })
          .catch(e => { console.log('profile poll failed', config.name, e); })
        );
    }

    // final step with catch so poll doesn't error
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

      return Device.ledOnWithDelay(config)
        .then(() => config.client.data())
        .then(data => { config.emitter.emit('data', data, result); })
        .finally(() => Device.ledOff(config));

    })
    .catch(e => { console.log('error', config.name, e); });
  }




  // --------------------------------------------------------------------------

  static setupLED(config) {
    config.led.client = new Gpio(config.led.gpio, 'out');
  }

  static ledOnWithDelay(config) {
    if(config.poll.flashMs === 0) { return Promise.resolve(); }
    //console.log('flash for Ms:', config.poll.flashMs);

    // todo suppress interrupt if desired by config during flash

    return new Promise((resolve, reject) => {
      config.led.client.write(1, err => {
        if(err) { reject(err); }
        config.led.flashtimer = setTimeout(() => {
          resolve();
        }, config.poll.flashMs);
      });
    });
  }

  static ledOff(config) {
    if(config.poll.flashMs === 0) { return Promise.resolve(); }

    // todo reenable interrupt if disabled during flash

    return new Promise((resolve, reject) => {
      config.led.client.write(0, err => {
        if(err) { reject(err); }
        resolve();
      });
    });
  }


  static setupInterrupt(config) {
    config.interrupt.client = new Gpio(config.interrupt.gpio, 'in', 'rising', { activeLow: true });
  }

  static enableInterrupt(config) {
    // cache so we can remove specific watch
    config.interrupt.wcb = (err, value) => Device.watchInt(config, err, value);
    config.interrupt.client.watch(config.interrupt.wcb);
  }

  static disableInterrupt(config) {
    if(config.interrupt == undefined) { return; }
    config.interrupt.client.unwatch(config.interrupt.wcb);
    delete config.interrupt.wcb;
  }
}

module.exports = Device;
