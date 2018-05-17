
const { Converter } = require('./converter.js');

const TCS34725_COMMAND_BIT = 0x80;

const CMD_TYPE_SPECIAL = 0b11;
const CMD_SPECIAL_CLEAR = 0b00110;

const ENABLE_REGISTER  = 0x00;
const ATIME_REGISTER   = 0x01;
const WTIME_REGISTER   = 0x03;
const AILTL_REGISTER   = 0x04;
const AILTH_REGISTER   = 0x05;
const AIHTL_REGISTER   = 0x06;
const AIHTH_REGISTER   = 0x07;
const PERS_REGISTER    = 0x0C;
const CONFIG_REGISTER  = 0x0D;
const CONTROL_REGISTER = 0x0F;
const ID_REGISTER      = 0x12;
const STATUS_REGISTER  = 0x13;

/*
 We use data block bellow instead
const CDATAL_REGISTER  = 0x14;
const CDATAH_REGISTER  = 0x15;
const RDATAL_REGISTER  = 0x16;
const RDATAH_REGISTER  = 0x17;
const GDATAL_REGISTER  = 0x18;
const GDATAH_REGISTER  = 0x19;
const BDATAL_REGISTER  = 0x1A;
const BDATAH_REGISTER  = 0x1B;
*/

const DATA_BLOCK_START_REGISTER = 0x14;
const THRESHOLD_BLOCK_START_REGISTER = 0x04;
// const PROFILE_BLOCK_START_REGISTER = 0x00;


/**
 *
 **/
class EnumUtil {
  static enumToValue(ename, emap) {
    const item = emap.find(({ name, value }) => name === ename);
    if(item === undefined) { throw Error('name not found in map: ' + ename); }
    return item.value;
  }

  static valueToEnum(evalue, emap) {
    const item = emap.find(({ name, value }) => value === evalue);
    if(item === undefined) { throw Error('value not found in map:' + evalue); }
    return item.name;
  }
}

/**
 *
 */
class Common {
  static _id(bus) {
    return bus.read(ID_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      const id = buffer.readUInt8(0);
      return id;
    });
  }

  static _enable(bus) {
    return bus.read(ENABLE_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      return Converter.parseEnable(buffer);
    });
  }

  static enable(bus, enable) {
    return bus.write(ENABLE_REGISTER | TCS34725_COMMAND_BIT, enable);
  }


  static _timing(bus) {
    return bus.read(ATIME_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      return Converter.parseTiming(buffer);
    });
  }

  static timing(bus, timing) {
    return bus.write(ATIME_REGISTER | TCS34725_COMMAND_BIT, timing);
  }

  static _wtiming(bus) {
    return bus.read(WTIME_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      return Converter.parseWTiming(buffer);
    });
  }

  static wtiming(bus, wtiming) {
    return bus.write(WTIME_REGISTER | TCS34725_COMMAND_BIT, wtiming);
  }

  static _threshold(bus) {
    return bus.read(THRESHOLD_BLOCK_START_REGISTER | TCS34725_COMMAND_BIT, 4).then(buffer => {
      return Converter.parseThreshold(buffer);
    });
  }

  static thresholdBulk(bus, threshold) {
    return bus.write(THRESHOLD_BLOCK_START_REGISTER | TCS34725_COMMAND_BIT, threshold);
  }

  static threshold(bus, threshold) {
    return Promise.all([
      bus.write(AILTL_REGISTER | TCS34725_COMMAND_BIT, threshold[0]),
      bus.write(AILTH_REGISTER | TCS34725_COMMAND_BIT, threshold[1]),
      bus.write(AIHTL_REGISTER | TCS34725_COMMAND_BIT, threshold[2]),
      bus.write(AIHTH_REGISTER | TCS34725_COMMAND_BIT, threshold[3])
    ]);
  }

  static _persistence(bus) {
    return bus.read(PERS_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      return Converter.parsePersistence(buffer);
    });
  }

  static persistence(bus, persistence) {
    return bus.write(PERS_REGISTER | TCS34725_COMMAND_BIT, persistence);
  }

  static _config(bus) {
    return bus.read(CONFIG_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      return Converter.parseConfiguration(buffer);
    });
  }

  static config(bus, config) {
    return bus.write(CONFIG_REGISTER | TCS34725_COMMAND_BIT, config);
  }

  static _control(bus) {
    return bus.read(CONTROL_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      return Converter.parseControl(buffer);
    });
  }

  static control(bus, control) {
    return bus.write(CONTROL_REGISTER | TCS34725_COMMAND_BIT, control);
  }

  static _status(bus) {
    return bus.read(STATUS_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      return Converter.parseStatus(buffer);
    });
  }

  /*
  static _profileBulk(bus) {
    return bus.read(PROFILE_BLOCK_START_REGISTER | TCS34725_COMMAND_BIT, 20).then(buffer => {
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
  */

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
    return Common._rawProfile(bus).then(parts => {
      const [enable, timing, wtiming, threshold, persistence, config, control, status] = parts;
      return Converter.formatProfile(enable, timing, wtiming, threshold, persistence, config, control, status);
    });
  }

  static setProfile(bus, enable, timing, wtiming, threshold, persistence, config, control) {
    // sets all independelntly, though, all maynot run in order
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
    // console.log('clearning interupt');
    const cmd = (CMD_TYPE_SPECIAL << 5) | CMD_SPECIAL_CLEAR;
    return bus.writeSpecial(cmd | TCS34725_COMMAND_BIT);
  }

  static _dataBulk(bus) {
    return bus.read(DATA_BLOCK_START_REGISTER | TCS34725_COMMAND_BIT, 8).then(buffer => {
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

module.exports.Common = Common;
module.exports.Converter = Converter;
