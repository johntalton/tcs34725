
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

const PON  = 0x01;
const AEN  = 0x02;
// reserved  0x04;
const WEN  = 0x08;
const AIEN = 0x10;

const AINT =   0b00010000;
const AVALID = 0b00000001;

const WLONG = 0b00000010;

const APRES = 0b00001111;

const AGAIN = 0b00000011;
const GAIN_X1 =  0b00;
const GAIN_X4 =  0b01;
const GAIN_X16 = 0b10;
const GAIN_X60 = 0b11;

const APRES_EVERY = 0b0000;
const APRES_1     = 0b0001;
const APRES_2     = 0b0010;
const APRES_3     = 0b0011;
const APRES_5     = 0b0100;
const APRES_10    = 0b0101;
const APRES_15    = 0b0110;
const APRES_20    = 0b0111;
const APRES_25    = 0b1000;
const APRES_30    = 0b1001;
const APRES_35    = 0b1010;
const APRES_40    = 0b1011;
const APRES_45    = 0b1100;
const APRES_50    = 0b1101;
const APRES_55    = 0b1110;
const APRES_60    = 0b1111;


/**
 *
 */
class Converter {
  /**
   * @param profile
   **/
  static formatProfile(enable, timing, wtiming, threshold, persistence, config, control, status) {
    // console.log('format profile', config.wlong, status);
    return {
      powerOn: enable.PON,
      active: enable.AEN,
      interrupts: enable.AIEN,
      wait: enable.WEN,
      waitTime: Converter.formatWTiming(wtiming, config.wlong),
      integrationTime: Converter.formatTiming(timing),
      threshold: { low: threshold.low, high: threshold.high },
      filtering: Converter.formatPersistence(persistence),
      gain: Converter.formatControl(control),

      valid: status.avalid,
      thresholdViolation: status.aint
    };
  }

  static toEnable(enable) {
    return (enable.AIEN ? AIEN : 0) |
           (enable.WEN ? WEN : 0) |
           (enable.AEN ? AEN : 0) |
           (enable.PON ? PON : 0);
  }

  static parseEnable(buffer) {
    const value = buffer.readInt8(0);

    return {
      AIEN: (value & AIEN) === AIEN,
      WEN: (value & WEN) === WEN,
      AEN: (value & AEN) === AEN,
      PON: (value & PON) === PON
    };
  }

  static toTimingMs(ms) {
    const count = Math.floor(ms / 2.4);
    if(count > 256) { throw new Error('timing ms out of range: ' + ms); }
    return 256 - count;
  }

  static parseTiming(buffer) {
    const value = buffer.readInt8(0);
    return { atime: value };
  }

  static formatTiming(timing) {
    const integCycles = 256 - timing.atime;
    const maxCount = integCycles * 1024;
    const millisecond = integCycles * 2.4;
    return {
      atime: timing.atime,
      integCycles: integCycles,
      maxCount: maxCount,
      millisecond: millisecond
    };
  }

  static toWTimingMs(ms) {
    let assumedWlong = false;
    let waitCount = Math.round(ms / 2.4);

    if(ms > 256) {
      // assume wlong true desired
      assumedWlong = true;
      waitCount = Math.round(ms / (2.4 * 12));
    }

    if(waitCount > 256) { throw new Error('millisecons out of range: ' + ms); }
    return [Converter.toWTimingCount(waitCount), assumedWlong];
  }

  static toWTimingCount(count) {
    if(count < 0 || count > 256) { throw new Error('count out of range: ' + count); }
    return 256 - count;
  }

  static parseWTiming(buffer) {
    const value = buffer.readInt8(0);
    return { wtime: value };
  }

  static formatWTiming(wtiming, wlong) {
    const waitCount = 256 - wtiming.wtime;
    const ms = waitCount * 2.4 * (wlong ? 12 : 1);
    return {
      wtime: wtiming.wtime,
      wlong: wlong,
      waitCount: waitCount,
      milliseconds: ms
    };
  }

  static toThreshold(low, high) {
    return [
      low & 0xFF, low >> 8 & 0xFF,
      high & 0xFF, high >> 8 & 0xFF
   ];
  }

  static parseThreshold(buffer) {
    const low = buffer.readUInt16LE(0);
    const high = buffer.readUInt16LE(2);
    return {
      low: low,
      high: high
    };
  }

  static toPersistence(persistence) {
    let apres;
    switch(persistence) {
    case 0: apres = APRES_EVERY; break;
    case true: apres = APRES_EVERY; break;
    case false: apres = APRES_EVERY; break;
    case 1: apres = APRES_1; break;
    case 2: apres = APRES_2; break;
    case 3: apres = APRES_3; break;
    case 5: apres = APRES_5; break;
    case 10: apres = APRES_10; break;
    case 15: apres = APRES_15; break;
    case 20: apres = APRES_20; break;
    case 25: apres = APRES_25; break;
    case 30: apres = APRES_30; break;
    case 35: apres = APRES_35; break;
    case 40: apres = APRES_40; break;
    case 45: apres = APRES_45; break;
    case 50: apres = APRES_50; break;
    case 55: apres = APRES_55; break;
    case 60: apres = APRES_60; break;
    default: throw new Error('unknown persistent value: ' + persistence);
    }

    return apres;
  }

  static parsePersistence(buffer) {
    const value = buffer[0] & APRES;
    return { apres: value };
  }

  static formatPersistence(persistence) {
    let persist;
    switch(persistence.apres) {
    case APRES_EVERY: persist = true; break;
    case APRES_1: persist = 1; break;
    case APRES_2: persist = 2; break;
    case APRES_3: persist = 3; break;
    case APRES_5: persist = 5; break;
    case APRES_10: persist = 10; break;
    case APRES_15: persist = 15; break;
    case APRES_20: persist = 20; break;
    case APRES_25: persist = 25; break;
    case APRES_30: persist = 30; break;
    case APRES_35: persist = 35; break;
    case APRES_40: persist = 40; break;
    case APRES_45: persist = 45; break;
    case APRES_50: persist = 50; break;
    case APRES_55: persist = 55; break;
    case APRES_60: persist = 60; break;
    default: throw new Error('unknown persistence: ' + persistence);
    }
    return { apres: persistence.apres, persist: persist };
  }

  static toConfiguration(wlong) {
    return wlong ? WLONG : 0;
  }

  static parseConfiguration(buffer) {
    const value = buffer.readInt8(0);
    return { wlong: (value & WLONG) === WLONG };
  }

  static toControl(multiplier) {
    let again;

    switch(multiplier) {
    case 1: again = GAIN_X1; break;
    case 4: again = GAIN_X4; break;
    case 16: again = GAIN_X16; break;
    case 60: again = GAIN_X60; break;
    default: throw new Error('unknown multiplier: ' + multiplier);
    }

    return again;
  }

  static parseControl(buffer) {
    const value = buffer.readInt8(0);
    const again = value & AGAIN;
    return { again: again };
  }

  static formatControl(control) {
    let multiplier;
    switch(control.again) {
    case GAIN_X1: multiplier = 1; break;
    case GAIN_X4: multiplier = 4; break;
    case GAIN_X16: multiplier = 16; break;
    case GAIN_X60: multiplier = 60; break;
    default: throw Error('unknown control: ' + control);
    }

    return { again: control.again, multiplier: multiplier };
  }

  static parseStatus(buffer) {
    const value = buffer.readInt8(0);
    return {
      aint: (value & AINT) === AINT,
      avalid: (value & AVALID) === AVALID
    };
  }

  static formatData(data) {
    const lt = Converter.calculateLuxAndTempature(data);
    return {
      raw: data,
      ratio: Converter.calculateRatio(data),
      rgb: Converter.calculateRGB(data),
      lux: lt.lux,
      tempature: lt.tempatureK
    };
  }

  static calculateRatio(raw) {
    return {
      r: raw.r / 0xFFFF,
      g: raw.g / 0xFFFF,
      b: raw.b / 0xFFFF,
      c: raw.c / 0XFFFF
    };
  }

  static calculateRGB(raw) {
    if(raw.c <= 0) { return { r: 0, g: 0, b: 0, zero: true }; }

    const red = raw.r / raw.c;
    const green = raw.g / raw.c;
    const blue = raw.b / raw.c;

    const r = Math.trunc(Math.pow(Math.trunc(red * 256) / 255, 2.5) * 255);
    const g = Math.trunc(Math.pow(Math.trunc(green * 256) / 255, 2.5) * 255);
    const b = Math.trunc(Math.pow(Math.trunc(blue * 256) / 255, 2.5) * 255);

    return { r: r, g: g, b: b };
  }

  static calculateLuxAndTempature(raw) {
    const { r, g, b } = raw;

    // taken from adafruit version, not sure source or assumptions

    const x = -0.14282 * r + 1.54924 * g + -0.95641 * b;
    const y = -0.32466 * r + 1.57837 * g + -0.73191 * b;
    const z = -0.68202 * r + 0.77073 * g + 0.56332 * b;

    const xc = x / (x + y + z);
    const yc = y / (x + y + z);

    const n = (xc - 0.3320) / (0.1858 - yc);
    const cct = (449.0 * Math.pow(n, 3)) +
                (3525.0 * Math.pow(n, 2)) +
                (6823.3 * n) +
                5520.33;

    return { lux: y, tempatureK: cct };
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
