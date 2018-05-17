
const fs = require('fs');

const BASE_10 = 10;

/**
 *
 **/
class Config {
  // static _getBool(cfg, name, defaultBool) {}

  static _getMs(cfg, name, defaultMs, altDefaultMs) {
    if(cfg[name] !== undefined) {
      return cfg[name] ? defaultMs : altDefaultMs;
    }

    const s = cfg[name + 'S'];
    const ms = cfg[name + 'Ms'];

    if(s === undefined && ms === undefined) { return defaultMs; }

    const sz = s !== undefined ? s : 0;
    const msz = ms !== undefined ? ms : 0;

    const S = parseInt(sz, BASE_10);
    const Ms = parseInt(msz, BASE_10);
    if(Number.isNaN(S) || Number.isNaN(Ms)) { throw Error('NaN S or Ms value'); }

    return S * 1000 + Ms;
  }

  static config(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if(err) { reject(err); return; }
        resolve(JSON.parse(data));
      });
    }).then(Config._normalize);
  }

  static _normalize(rawCfg) {
    if(rawCfg === undefined) { throw Error('undefined config'); }

    return {
      devices: Config._normalizeDevices(rawCfg.devices),
      mqtt: Config._normalizeMqtt(rawCfg.mqtt)
    };
  }

  static _normalizeDevices(rawDevices) {
    if(rawDevices === undefined) { return []; }

    let d = rawDevices;
    if(!Array.isArray(d)) { d = [d]; }

    return d.map((rawDevice, index) => {
      const name = rawDevice.name ? rawDevice.name : '#' + index;

      const active = rawDevice.active !== undefined ? rawDevice.active : true;

      const S = rawDevice.retryIntervalS ? rawDevice.retryIntervalS : 0;
      const Ms = rawDevice.retryIntervalMs ? rawDevice.retryIntervalMs : 0;
      const retryIntervalMs = S * 1000 + Ms;

      return {
        name: name,
        bus: Config._normalizeBus(rawDevice.bus),
        active: active,

        retryIntervalMs: retryIntervalMs,

        poll: Config._normalizePoll(rawDevice.poll),
        step: Config._normalizeStep(rawDevice.step),

        clearIntOnStart: rawDevice.clreaIntOnStart !== undefined ? rawDevice.clearIntOnStart : true,

        profile: Config._normalizeProfile(rawDevice.profile),

        led: Config._normalizeLed(rawDevice.led),
        interrupt: Config._normalizeInt(rawDevice.interrupt)
      };
    });
  }

  static _normalizeBus(rawBus) {
    if(rawBus === undefined) { throw Error('must specifiy bus for device'); }

    if(rawBus.driver === undefined) { throw Error('device bus missing driver'); }
    if(rawBus.id === undefined) { throw Error('device bus missing id'); }

    return {
      driver: rawBus.driver,
      id: rawBus.id
    };
  }

  static _normalizePoll(rawPoll) {
    if(rawPoll === undefined) { return false; }

    const pollIntervalMs = Config._getMs(rawPoll, 'pollInterval', 0);
    const flashMs = Config._getMs(rawPoll, 'flash', 2 * 1000, 0);

    const status = rawPoll.status !== undefined ? rawPoll.status : true;
    const profile = rawPoll.profile !== undefined ? rawPoll.profile : true;
    const skipData = rawPoll.skipData !== undefined ? rawPoll.skipData : false;

    const knownM = [1, 4, 16, 60]; // todo move to sensor
    let cycleM = false;
    if(rawPoll.cycleMultiplier !== undefined) {
      if(rawPoll.cycleMultiplier === true) {
        cycleM = knownM;
      } else if(!Array.isArray(rawPoll.cycleMultiplier)) {
        throw Error('cycleMultiplier is not array | boolean');
      }
    }

    return {
      pollIntervalMs: pollIntervalMs,
      flashMs: flashMs,
      status: status,
      profile: profile,
      skipData: skipData,
      cycleMultiplier: cycleM
    };
  }

  static _normalizeStep(rawStep) {
    if(rawStep === undefined) { return false; } // todo { disabled: true }

    // TODO
    return rawStep;
  }

  static _normalizeProfile(rawProfile) {
    // if(rawProfile.powerOn === undefined) {  }

    // TODO scheme from the lib?
    return rawProfile;
  }

  static _normalizeLed(rawLed) {
    return Config._normalizeGpio(rawLed, 'led');
  }

  static _normalizeInt(rawInt) {
    return Config._normalizeGpio(rawInt, 'interrupt');
  }

  static _normalizeGpio(rawGpio, which) {
    if(rawGpio === undefined) { return { disabled: true, why: 'undefined' }; }

    if(rawGpio.gpio === undefined) { throw Error('gpio pin not configured'); }
    if(Number.isNaN(parseInt(rawGpio.gpio, BASE_10))) { throw Error('gpio pin not a number'); }

    if(rawGpio.disabled !== undefined && rawGpio.disabled !== true) {
      console.log('remove disabled attribute if not true');
    }
    const disabled = rawGpio.disabled !== undefined ? rawGpio.disabled : false;

    return {
      name: which,
      disabled: disabled,
      gpio: rawGpio.gpio
    };
  }

  static _normalizeMqtt(rawMqtt) {
    const envUrl = process.env.mqtturl; // eslint-disable-line no-process-env
    const defaultReconnectMs = 10 * 1000;

    if(rawMqtt === undefined) { return { url: envUrl, reconnectMs: defaultReconnectMs }; }

    const url = rawMqtt.url !== undefined ? rawMqtt.url : envUrl;
    const reconnectMs = Config._getMs(rawMqtt, 'reconnect', defaultReconnectMs);

    return {
      url: url,
      reconnectMs: reconnectMs
    };
  }
}

module.exports = Config;
