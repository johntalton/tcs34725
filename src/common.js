
const { Converter } = require('./converter.js');
const {
  Registers,
  makeCommand,
  COMMAND_CLEAR, COMMAND_BULK_DATA, COMMAND_BULK_PROFILE
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


  static _timing(bus) {
    return bus.read(makeCommand(Registers.ATIME), 1).then(buffer => {
      return Converter.parseTiming(buffer);
    });
  }

  static timing(bus, timing) {
    return bus.write(makeCommand(Registers.ATIME), timing);
  }

  static _wtiming(bus) {
    return bus.read(makeCommand(Registers.WTIME), 1).then(buffer => {
      return Converter.parseWTiming(buffer);
    });
  }

  static wtiming(bus, wtiming) {
    return bus.write(makeCommand(Registers.WTIME), wtiming);
  }

  static _threshold(bus) {
    return bus.read(makeCommand(Registers.THRESHOLD_BLOCK_START), 4).then(buffer => {
      return Converter.parseThreshold(buffer);
    });
  }

  static thresholdBulk(bus, threshold) {
    return bus.write(makeCommand(Registers.THRESHOLD_BLOCK_START), threshold);
  }

  static threshold(bus, threshold) {
    return Promise.all([
      bus.write(makeCommand(Registers.AILTL), threshold[0]),
      bus.write(makeCommand(Registers.AILTH), threshold[1]),
      bus.write(makeCommand(Registers.AIHTL), threshold[2]),
      bus.write(makeCommand(Registers.AIHTH), threshold[3])
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
      // console.log(buffer);

      const enable = Converter.parseEnable(buffer.readUInt8(0));
      const timing = Converter.parseTiming(buffer.readUInt8(1));
      const wtiming = Converter.parseWTiming(buffer.readUInt8(3));
      const threshold = Converter.parseThreshold(buffer.readInt16LE(4), buffer.readInt16LE(6));

      const persistence = Converter.parsePersistence(buffer.readUInt8(13));
      const config = Converter.parseConfiguration(buffer.readUInt8(14));
      const control = Converter.parseControl(buffer.readUInt8(16))
      const status = Converter.parseStatus(buffer.readUInt8(19));

      return [enable, timing, wtiming, threshold, persistence, config, control, status];
    });
  }

  static _rawProfile(bus) {
    return Promise.all([
      Common._enable(bus),
      Common._timing(bus),
      Common._wtiming(bus),
      Common._threshold(bus),
      Common._persistence(bus),
      Common._config(bus),
      Common._control(bus),
      Common._status(bus)
    ]);
  }

  static _profile(bus) {
    return Common._profileBulk(bus).then(parts => {
    // return Common._rawProfile(bus).then(parts => {
      const [enable, timing, wtiming, threshold, persistence, config, control, status] = parts;
      return Converter.formatProfile(enable, timing, wtiming, threshold, persistence, config, control, status);
    });
  }

  static setProfile(bus, enable, timing, wtiming, threshold, persistence, config, control) {
    // sets all independently, though, all may not run in order
    return Promise.all([
      Common.timing(bus, timing),
      Common.wtiming(bus, wtiming),
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
