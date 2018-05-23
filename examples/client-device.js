
const EventEmitter = require('events');

const { Gpio } = require('onoff');

const rasbus = require('rasbus');

const { Tcs34725 } = require('../src/tcs34725.js');

class Device {
  // @public
  static on(config, event, cb) {
    return config.emitter.on(event, cb);
  }

  /**
   * Attempt initial device setup, start retry if needed failure.
   *  (setup failurs are supprsed by retry, and thus promis alwasy resolves)
   * @return promise the resolves one the process starts.
   **/
  // @public
  static setupDeviceWithRetry(config) {
    return Device.setupDevice(config)
      .then(() => Device.configureDevice(config))
      .catch(err => {
        console.log('initial setup failed, start retry', config.name, err.message);
        console.log(err);
        config.retrytimer = setInterval(Device.retrySetup_interval, config.retryIntervalMs, config);
      });
  }

  static setupDevice(config) {
    // console.log('setupDevice', config.name);
    if(config.emitter === undefined) { config.emitter = new EventEmitter(); }

    return rasbus.byname(config.bus.driver).init(...config.bus.id)
      .then(bus => Tcs34725.init(bus))
      .then(tcs => Promise.all([Promise.resolve(tcs), tcs.id()]))
      .then(([tcs, id]) => {
        if(id !== Tcs34725.CHIP_ID) { throw Error('invalid/unknonw chip id: ' + id); }

        Device.setupLED(config);
        Device.setupInterrupt(config);
        config.client = tcs;

        console.log('Device up', config.name);

        if(config.led.disabled && config.poll.flashMs !== 0) {
          console.log('flash enabled but led is disabled or missing');
        }
        if(config.interrupt.disabled && config.step !== false) {
          console.log('stepper enabled but interrupt diabled or missing');
        }
      });
  }

  static configureDevice(config) {
    // console.log('setting profile', config.name);
    // TODO disable profile on setup if previously configured, or if trueded state
    return config.client.setProfile(config.profile).then(() => {
      if(config.clearIntOnStart) {
        console.log('Device clearing interrupt on start', config.name);
        return config.client.clearInterrupt();
      }

      return Promise.resolve();
    });
  }

  static async retrySetupInterval(config) {
    // top level interval callbak must await all promises
    // and catch all errors

    // console.log('retry setup');
    await Device.setupDevice(config)
       // TODO where is configure Device in this chain
      .catch(e => {
        console.log('retry setup failed', config.name, e.message);
      });
  }

  // @public
  static startDevice(config) {
    console.log('start device', config.name);
    if(config.client === undefined) { return; }
    Device.setupPoller(config);
    Device.setupStepper(config);
  }

  // @public
  static stopDevice(config) {
    // console.log('stop device', config.name);
    if(config.client === undefined) { return; }
    if(config.poll) {
      clearInterval(config.poll.timer);
      config.poll.timer = undefined;
    }

    Device.disableInterrupt(config);
  }

  static setupPoller(config) {
    if(config.poll === undefined) { return; }
    if(config.poll === false) { return; }
    config.poll.timer = setInterval(Device.poll, config.poll.pollIntervalMs, config);
  }

  static setupStepper(config) {
    if(config.step === false) { return; }

    Device.enableInterrupt(config);
  }

  static async watchInt(config, err, value) {
    // top level init watch must
    // await all promises and catch all errors

    if(err) {
      console.log('gpio interrupt error', config.name, err);
      // todo teardown client or just ignore, or what
      return;
    }

    // console.log('value', value);
    if(value !== 1) { console.log('   interrupt high but not'); }

    await Promise.all([
      config.client.threshold(),
      config.client.data()
    ])
      .then(([threshold, data]) => Device.handleThreshold(config, threshold, data))
      .catch(e => {
        console.log('error in watch interrupt', config.name, e);
      });
  }

  static handleThreshold(config, threshold, data) {
    let direction = 0;
    if(data.raw.c > threshold.high) {
      direction = +1;
    } else if(data.raw.c < threshold.low) {
      direction = -1;
    } else { direction = 0; }

    // console.log('reconfigure thresholds', config.name, data.raw.c, threshold, direction);

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
    } else {
      console.log('direction Zero, odd as this is interrupt driven, quick mover?');
    }

    // after that, we just emit the change and clear
    return first.then(() => {
      config.emitter.emit('step', newt, direction, data.raw.c);
      return config.client.clearInterrupt();
    });
  }

  static pollDeviceInfo(config) {
    // if nothing enbabled, just return
    if(config.poll.status === false && config.poll.profile === false) {
      return Promise.resolve({});
    }

    // profile true overrides all (none case handled above)
    const full = config.poll.profile;

    if(!full) {
      // not full is just status
      return config.client.status()
        .then(s => {
          return {
            valid: s.avalid,
            thresholdViolation: s.aint
          };
        });
    }

    // full profile fetch
    return config.client.profile();
  }

  static pollPerformSoftwareInterrupt(config, result, data) {
    if(result.thresholdViolation !== undefined) {
      // console.log('polled interrupt value', config.name, result.thresholdViolation);
      if(result.thresholdViolation === true) {
        //
        if(result.threshold === undefined) {
          return Promise.reject(Error('software interrupt skipped, no thresholdr'));
        }
        if(data === undefined) {
          return Promise.reject(Error('software interrupt skipped, no data'));
        }

        return Device.handleThreshold(config, result.threshold, data);
      }
    }
    return Promise.resolve(result);
  }

  static pollPerformMultiplyerRotate() {
    // if cycle multiplier on poll is enabled do that
    // false | array
    /* if(config.poll.cycleMultiplyer !== false) {
      const knownM = [1, 4, 16, 16]; // todo
      if(config.poll.lastMultiplierIndex === undefined) { config.poll.lastMultiplierIndex = 0; }
      const newM = knownM[config.poll.lastMultiplierIndex];
      config.poll.lastMultiplierIndex += 1;
      if(config.poll.lastMultiplierIndex >= knownM.length) { config.poll.lastMultiplierIndex = 0; }
      const cycleprofile = { ...config.profile, multiplier: newM };
      steps = steps.then(result => config.client.setProfile(cycleprofile));
    } */

    return Promise.resolve();
  }

  static pollPerformBeforeAll(config, result) {
    return Promise.all([
      Device.pollPerformMultiplyerRotate()
    ])
    .catch(e => { console.log('Error in Before action', e); });
  }

  static pollPerformAfterAll(config, result, data) {
    return Promise.all([
      Device.pollPerformSoftwareInterrupt(config, result, data)
    ])
    .catch(e => { console.log('Error in After action', e); });
  }

  static async poll(config) {
    // top level of poll function is syncrounous, and catches all errors

    // first, get any info before we read data, if configured
    await Device.pollDeviceInfo(config)
      .then(result => {
        // check results to see if all ok, if we bothered running anything
        if(result.valid !== undefined && !result.valid) {
          console.log('data integration not completed / not ready', config.name, result);
          return Promise.resolve();
        }

        return Device.pollPerformBeforeAll(config, result)
          .then(() => result); // pass along
      })
      .then(result => {
        const swInterruptEnabled = true;

        // lastly if we skip data polls, then we are done, unless
        // software interrupts are on and there was a threshold violation
        // in which case a read is needed to capture state.
        const skipData = config.poll.skipData &&
          ((!swInterruptEnabled) || (swInterruptEnabled && !result.thresholdViolation));

        if(skipData) { console.log('skip'); return Promise.resolve(); }

        // do that glorious data read
        return Device.ledOnWithDelay(config)
          .then(() => config.client.data())
          .then(data => Device.pollPerformAfterAll(config, result, data)
            .then(() => { config.emitter.emit('data', data, result); }))
          .finally(() => Device.ledOff(config));
      })
      .catch(e => { console.log('poll error', config.name, e); });
  }

  // --------------------------------------------------------------------------

  static setupLED(config) {
    if(config.led.disabled) { return; }
    try {
      config.led.client = new Gpio(config.led.gpio, 'out');
    }
    catch(e) {
      console.log('new Gpio caused excption - disable led', e.message);
      config.led.disabled = true;
    }
  }

  static ledOnWithDelay(config) {
    if(config.led.disabled) { return Promise.resolve(); }
    if(config.poll.flashMs === 0) { return Promise.resolve(); }
    // console.log('flash for Ms:', config.poll.flashMs);

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
    if(config.led.disabled) { return Promise.resolve(); }
    if(config.poll.flashMs === 0) { return Promise.resolve(); }

    // todo reenable interrupt if disabled during flash

    return new Promise((resolve, reject) => {
      config.led.client.write(0, err => {
        if(err) { reject(err); }
        resolve();
      });
    });
  }

  // --------------------------------------------------------------------------

  static setupInterrupt(config) {
    if(config.interrupt.disabled) { return; }
    try {
      config.interrupt.client = new Gpio(config.interrupt.gpio, 'in', 'rising', { activeLow: true });
    }
    catch(e) {
      console.log('new Gpio caused exception - disable hw interrupt', e.message);
      config.interrupt.disabled = true;
    }
  }

  static enableInterrupt(config) {
    // todo rename? as this is a full setup/teardown for each enable/disable and not for pauseing
    //   as this causes a full cleanup of the underlining client. pause should be in the actaull handler?

    if(config.interrupt.disabled) { return; }
    if(config.interrupt.client === undefined) { throw Error('client not defined'); } // todo over agressiv checking
    config.interrupt.wcb = (err, value) => Device.watchInt(config, err, value);
    config.interrupt.client.watch(config.interrupt.wcb);
  }

  static disableInterrupt(config) {
    if(config.interrupt.disabled) { return; }
    config.interrupt.client.unwatch(config.interrupt.wcb);
    delete config.interrupt.wcb;
  }
}

module.exports = Device;
