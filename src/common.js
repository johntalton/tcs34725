const { NameValueUtil } = require('@johntalton/and-other-delights');

const { Converter } = require('./converter.js');
const {
  Registers,
  Enumerations,
  makeCommand,
  COMMAND_CLEAR, COMMAND_BULK_DATA, COMMAND_BULK_PROFILE, COMMAND_BULK_THRESHOLD
} = require('./defs.js');

/**
 *
 */
class Common {
  static _id(bus) {
    return bus.read(makeCommand(Registers.ID), 1).then(buffer => {
      const id = buffer.readUInt8(0);
      return id;
    });
  }

  static _enable(bus) {
    return bus.read(makeCommand(Registers.ENABLE), 1).then(buffer => {
      return Converter.parseEnable(buffer);
    });
  }

  static enable(bus, enable) {
    return bus.write(makeCommand(Registers.ENABLE), enable);
  }


  static _integrationTiming(bus) {
    return bus.read(makeCommand(Registers.ATIME), 1).then(buffer => {
      return Converter.parseIntegrationTiming(buffer);
    });
  }

  static timing(bus, timing) {
    return bus.write(makeCommand(Registers.ATIME), timing);
  }

  static _waitTiming(bus) {
    return bus.read(makeCommand(Registers.WTIME), 1).then(buffer => {
      return Converter.parseWaitTiming(buffer);
    });
  }

  static wtiming(bus, wtiming) {
    return bus.write(makeCommand(Registers.WTIME), wtiming);
  }

  static _threshold(bus) {
    return bus.read(COMMAND_BULK_THRESHOLD, 4).then(buffer => {
      return Converter.parseThreshold(buffer);
    });
  }

  static thresholdBulk(bus, threshold) {
    const thresholdBytes = Converter.toThreshold(threshold);
    return bus.write(COMMAND_BULK_THRESHOLD, Buffer.from(thresholdBytes));
  }

  static threshold(bus, threshold) {
    console.log('setting threshold', threshold);
    // todo only set `high` or `low` if they exist / not undefined
    const thresholdBytes = Converter.toThreshold(threshold);
    return Promise.all([
      bus.write(makeCommand(Registers.AILTL), thresholdBytes[0]),
      bus.write(makeCommand(Registers.AILTH), thresholdBytes[1]),
      bus.write(makeCommand(Registers.AIHTL), thresholdBytes[2]),
      bus.write(makeCommand(Registers.AIHTH), thresholdBytes[3])
    ]);
  }

  static _persistence(bus) {
    return bus.read(makeCommand(Registers.PERS), 1).then(buffer => {
      return Converter.parsePersistence(buffer);
    });
  }

  static persistence(bus, persistence) {
    return bus.write(makeCommand(Registers.PERS), persistence);
  }

  static _config(bus) {
    return bus.read(makeCommand(Registers.CONFIG), 1).then(buffer => {
      return Converter.parseConfiguration(buffer);
    });
  }

  static config(bus, config) {
    return bus.write(makeCommand(Registers.CONFIG), config);
  }

  static _control(bus) {
    return bus.read(makeCommand(Registers.CONTROL), 1).then(buffer => {
      return Converter.parseControl(buffer);
    });
  }

  static control(bus, control) {
    return bus.write(makeCommand(Registers.CONTROL), control);
  }

  static _status(bus) {
    return bus.read(makeCommand(Registers.STATUS), 1).then(buffer => {
      return Converter.parseStatus(buffer);
    });
  }

  static _profileBulk(bus) {
    return bus.read(COMMAND_BULK_PROFILE, 20).then(buffer => {
      const enable = Converter.parseEnable(buffer.subarray(0, 1));
      const integrationTiming = Converter.parseIntegrationTiming(buffer.subarray(1, 2));
      // reserved
      const waitTiming = Converter.parseWaitTiming(buffer.subarray(3, 4));
      const threshold = Converter.parseThreshold(Buffer.concat([buffer.subarray(4, 6), buffer.subarray(6, 8)]));
      // reserved
      const persistence = Converter.parsePersistence(buffer.subarray(12, 13));
      const config = Converter.parseConfiguration(buffer.subarray(13, 14));
      // reserved
      const control = Converter.parseControl(buffer.subarray(15, 16));
      // reserved
      const status = Converter.parseStatus(buffer.subarray(19, 20));

      //
      return [enable, integrationTiming, waitTiming, threshold, persistence, config, control, status];
    });
  }

  static _rawProfile(bus) {
    return Promise.all([
      Common._enable(bus),
      Common._integrationTiming(bus),
      Common._waitTtiming(bus),
      Common._threshold(bus),
      Common._persistence(bus),
      Common._config(bus),
      Common._control(bus),
      Common._status(bus)
    ]);
  }

  static _profile(bus) {
    return Common._profileBulk(bus)
    // return Common._rawProfile(bus)
    .then(parts => {
      const [enable, integrationTiming, waitTiming, threshold, persistence, config, control, status] = parts;
      return {
        ...enable,
        ...Converter.formatWaitTiming(waitTiming, config.wlong),
        ...integrationTiming,
        threshold: threshold,
        // ...threshold,
        filtering: NameValueUtil.toName(persistence.apres, Enumerations.APRES_ENUM_MAP),
        gain: NameValueUtil.toName(control.again, Enumerations.GAIN_ENUM_MAP),

        ...status
      };
    });
  }

  static setProfile(bus, profile) {
    const enable = Converter.toEnable(profile); // todo do not pass entire profile
    const timing = Converter.toTimingMs(profile.integrationTimeMs);
    const [wtime, wlong] = Converter.toWTimingMs(profile.waitTimeMs);
    const threshold = profile.threshold || { low: profile.low, high: profile.high };
    const persistence = Converter.toPersistence(profile.filtering);
    const config = Converter.toConfiguration(wlong);
    const control = Converter.toControl(profile.gain);

    // sets all independently, though, all may not run in order
    return Promise.all([
      Common.timing(bus, timing),
      Common.wtiming(bus, wtime),
      Common.threshold(bus, threshold),
      Common.persistence(bus, persistence),
      Common.config(bus, config),
      Common.control(bus, control)
    ])
    .then(() => Common.enable(bus, enable));
  }

  static clearInterrupt(bus) {
    // console.log('clearing interrupt');
    return bus.writeSpecial(COMMAND_CLEAR);
  }

  static _dataBulk(bus) {
    return bus.read(COMMAND_BULK_DATA, 8).then(buffer => {
      const c = buffer.readUInt16LE(0);
      const r = buffer.readUInt16LE(2);
      const g = buffer.readUInt16LE(4);
      const b = buffer.readUInt16LE(6);

      // const c = (buffer.readUInt8(1) << 8) | buffer.readUInt8(0);

      return { r: r, g: g, b: b, c: c };
    });
  }

  static data(bus) {
    return Common._dataBulk(bus).then(Converter.formatData);
  }
}

module.exports = { Common, Converter };
