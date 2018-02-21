"use strict";

const fs = require('fs');

class Config {
  static config(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if(err) { console.log(); resolve(); return; }
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
    if(rawDevices === undefined) { console.log('no devices specified'); return []; }

    let d = rawDevices;
    if(!Array.isArray(d)) { d = [devices]; }

    return d.map((rawDevice, index) => {
      const name = rawDevice.name ? rawDevice.name : '#' + index;

      const S = rawDevice.retryIntervalS ? rawDevice.retryIntervalS : 0;
      const Ms = rawDevice.retryIntervalMs ? rawDevice.retryIntervalMs : 0;
      const retryIntervalMs = S * 1000 + Ms;

      return {
        name: name,
        bus: Config._normalizeBus(rawDevice.bus),

        retryIntervalMs: retryIntervalMs,

        poll: Config._normalizePoll(rawDevice.poll),
        step: Config._normalizeStep(rawDevice.step),
        
        clearIntOnStart: (rawDevice.clreaIntOnStart !== undefined) ? rawDrvice.clearIntOnStart : true,

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
    if(rawPoll === undefined) { console.log('poll disabled'); return false; }
    
    const S = rawPoll.pollIntervalS ? rawPoll.pollIntervalS : 0;
    const Ms = rawPoll.pollIntervalMs ? rawPoll.pollIntervalMs : 0;
    const pollIntervalMs = S * 1000 + Ms;

    const defaultFlashMs = 2000;
    let flashMs = (rawPoll.flash !== undefined && rawPoll.flash) ? defaultFlashMs : 0;
    if(rawPoll.flashMs !== undefined || rawPoll.flashS !== undefined) {
      const S = rawPoll.flashS ? rawPoll.flashS : 0;
      const Ms = rawPoll.flashMs ? rawPoll.flashMs : 0;
      flashMs = S * 1000 + Ms;
    }

    const status = rawPoll.status !== undefined ? rawPoll.status : true;
    const profile = rawPoll.profile !== undefined ? rawPoll.profile : true;
    const skipData = rawPoll.skipData !== undefined ? rawPoll.skipData : false;

    return {
      pollIntervalMs: pollIntervalMs,
      falshMs: flashMs,
      status: status,
      profile: profile,
      skipData: skipData
    }    
  }

  static _normalizeStep(rawStep) {
    if(rawStep === undefined) { console.log('step disabled'); return false; }

    // TODO
    return rawStep
  }

  static _normalizeProfile(rawProfile) {

    let on = false;
    if(rawProfile.powerOn === undefined) { console.log('poweron assumed false'); }

    return rawProfile;

    return {
      powerOn: on
    };
  }

  static _normalizeLed(rawLed) {
    return Config._normalizeGpio(rawLed, 'led');
  }

  static _normalizeInt(rawInt) {
    return Config._normalizeGpio(rawInt, 'interrupt');
  }

  static _normalizeGpio(rawGpio, which) {
    if(rawGpio === undefined) { console.log('gpio not configured', which); return undefined; }

    if(rawGpio.gpio === undefined) { throw Error('gpio pin not configured'); }
    const gpio = rawGpio.gpio;

    return {
      gpio: gpio
    };
  }

  static _normalizeMqtt(rawMqtt) {
    let url = process.env.mqtturl;
    if(rawMqtt !== undefined && rawMqtt.url === undefined) {
      url = rawMqtt.url;
    }
    
    let reconnectMs = 10 * 1000;
    if(rawMqtt !== undefined) {
      const S = rawMqtt.reconnectS ? rawMqtt.reconnectS : 0;
      const Ms = rawMqtt.reconnectMs ? rawMqtt.reconnectMs : 0;
      reconnectMs = S * 1000 + Ms;
    }

    return {
      url: process.env.mqtturl,
      reconnectMs: reconnectMs
    };
  }
}

module.exports = Config;
