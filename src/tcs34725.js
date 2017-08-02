
  const TCS34725_I2C_ADDRESS = 0x29;

  const TCS34725_I2C_PART_NUMBER = 0x44 // TCS34721 and TCS34725
  // const TCS_I2C_PART_NUMBER = 0x4D // TCS34723 and TCS34727

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
  const CDATAL_REGISTER  = 0x14;
  const CDATAH_REGISTER  = 0x15;
  const RDATAL_REGISTER  = 0x16;
  const RDATAH_REGISTER  = 0x17;
  const GDATAL_REGISTER  = 0x18;
  const GDATAH_REGISTER  = 0x19;
  const BDATAL_REGISTER  = 0x1A;
  const BDATAH_REGISTER  = 0x1B;

  const DATA_BLOCK_START_REGISTER = 0x14;
  const THRESHOLD_BLOCK_START_REGISTER = 0x04;
  const PROFILE_BLOCK_START_REGISTER = 0x00;

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
class Tcs34725 {
  static init(bus){
    return Promise.resolve(new Tcs34725(bus));
  }

  constructor(bus) {
    this.bus = bus;
  }

  id() { return Common._id(this.bus); }

  profile() { return Common._profile(this.bus); }

  setProfile(profile) {
    if(profile.powerOn === undefined) { profile.powerOn = false; }
    if(profile.active === undefined) { profile.active = false; }
    if(profile.wait === undefined) { profile.wait = false; }
    if(profile.interrupts === undefined) { profile.interrupts = true; }
    if(profile.integrationTimeMs === undefined) { profile.integrationTimeMs = 0; }
    if(profile.waitTimeMs === undefined) { profile.waitTimeMs = 0; }
    if(profile.filtering === undefined) { profile.filtering = false; }
    if(profile.multiplyer === undefined) { profile.multiplyer = 1; }

    // console.log('set profile', profile);

    const enable = Converter.toEnable({
      AIEN: profile.interrupts,
      WEN: profile.wait,
      AEN: profile.active,
      PON: profile.powerOn
    });
    const timing = Converter.toTimingMs(profile.integrationTimeMs);
    const [wtiming, wlong] = Converter.toWTimingMs(profile.waitTimeMs);
    const threshold = Converter.toThreshold(0, 0);
    const persistence = Converter.toPersistence(profile.filtering);
    const config = Converter.toConfiguration(wlong);
    const control = Converter.toControl(profile.multiplyer);

    return Common.setProfile(this.bus, enable, timing, wtiming, threshold, persistence, config, control);
  }

  clearInterrupt() { return Common.clearInterrupt(this.bus); }

  data() { return Common.data(this.bus); }
}


/**
 *
 */
class Common {
  static _id(bus) {
    return bus.read(ID_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      const id = buffer.readUInt8(0);
      //console.log(buffer, id);
      return id;
    });
  }

  static _enable(bus) {
    return bus.read(ENABLE_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      // console.log('_enable', buffer);
      return Converter.parseEnable(buffer);
    });
  }

  static enable(bus, enable) {
    return bus.write(ENABLE_REGISTER | TCS34725_COMMAND_BIT, enable);
  }


  static _timing(bus) {
    return bus.read(ATIME_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      // console.log(buffer);
      return Converter.parseTiming(buffer);
    });
  }

  static timing(bus, timing) {
    return bus.write(ATIME_REGISTER | TCS34725_COMMAND_BIT, timing);
  }

  static _wtiming(bus) {
    return bus.read(WTIME_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      // console.log(buffer);
      return Converter.parseWTiming(buffer);
    });
  }

  static wtiming(bus, wtiming) {
    return bus.write(WTIME_REGISTER | TCS34725_COMMAND_BIT, wtiming);
  }

  static _threshold(bus) {
    return bus.read(AILTL_REGISTER | TCS34725_COMMAND_BIT, 4).then(buffer => {
      // console.log(buffer);
      return Converter.parseThreshold(buffer);
    });
  }

  static threshold(bus, threshold) {
    return bus.write(THRESHOLD_BLOCK_START_REGISTER | TCS34725_COMMAND_BIT, threshold);
  }

  static _persistence(bus) {
    return bus.read(PERS_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      // console.log(buffer);
      return Converter.parsePersistence(buffer);
    });
  }

  static persistence(bus, persistence) {
    return bus.write(PERS_REGISTER | TCS34725_COMMAND_BIT, persistence);
  }

  static _config(bus) {
    return bus.read(CONFIG_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      // console.log(buffer);
      return Converter.parseConfiguration(buffer);
    });
  }

  static config(bus, config) {
    return bus.write(CONFIG_REGISTER | TCS34725_COMMAND_BIT, config);
  }

  static _control(bus) {
    return bus.read(CONTROL_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      // console.log(buffer);
      return Converter.parseControl(buffer);
    });
  }

  static control(bus, control) {
    return bus.write(CONTROL_REGISTER | TCS34725_COMMAND_BIT, control);
  }

  static _status(bus) {
    return bus.read(STATUS_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      // console.log(buffer);
      return Converter.parseStatus(buffer);
    });
  }

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

      // console.log(enable, timing);

      return [enable, timing, wtiming, threshold, persistence, config, control, status];
    });
  }

  static _raw_profile(bus) {
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
    return Common._raw_profile(bus).then(parts => {
      // console.log(parts);
      const [enable, timing, wtiming, threshold, persistence, config, control, status] = parts;
      return Converter.formatProfile(enable, timing, wtiming, threshold, persistence, config, control, status);
    });
  }

  static setProfile(bus, enable, timing, wtiming, threshold, persistence, config, control) {
    // sets all independelntly, though, all maynot run in order
    return Promise.all([
      Common.timing(bus, timing),
      Common.wtiming(bus, wtiming),
      //Common.threshold(bus, threshold),
      Common.persistence(bus, persistence),
      Common.config(bus, config),
      Common.control(bus, control)
      ])
      .then(() => Common.enable(bus, enable));
  }

  static clearInterrupt(bus) {
    const cmd = (CMD_TYPE_SPECIAL << 5) | (CMD_SPECIAL_CLEAR);
    return bus.write(cmd | TCS34725_COMMAND_BIT);
  }

  static _dataBulk(bus) {
    return bus.read(DATA_BLOCK_START_REGISTER | TCS34725_COMMAND_BIT, 8).then(buffer => {
      // console.log('bulk data', buffer);
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


/**
 *
 */
class Converter {
  static formatProfile(enable, timing, wtiming, threshold, persistence, config, control, status) {
    // console.log('format profile', config.wlong, status);
    return {
      powerOn: enable.PON,
      active: enable.AEN,
      interrupts: enable.AIEN,
      wait: enable.WEN,
      waitTime: Converter.formatWTiming(wtiming, config.wlong),
      integrationTime: Converter.formatTiming(timing),
      thresholdHigh: threshold.high,
      thresholdLow: threshold.low,
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
    const value = buffer[0];

    // console.log('parse enable', value);
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
    const value = buffer[0];
    return { atime: value };
  }

  static formatTiming(timing) {
    const atime = timing.atime;
    const integCycles = (256 - atime);
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

    // console.log('toWtime', assumedWlong, waitCount);

    if(ms > 256){
      // assume wlong true desired
      assumedWlong = true;
      waitCount = Math.round(ms / (2.4 * 12));
      if(waitCount > 256) { throw new Error('millisecons out of range: ' + ms); }
      // console.log('toWtime wlong', assumedWlong, waitCount);
    }
    return [Converter.toWTimingCount(waitCount), assumedWlong];
  }

  static toWTimingCount(count) {
    if(count < 0 || count > 256) { throw new Error('count out of range: ' + count); }
    return 256 - count;
  }

  static parseWTiming(buffer) {
    const value = buffer[0];
    return { wtime: value };
  }

  static formatWTiming(wtiming, wlong) {
    const waitCount = 256 - wtiming.wtime;
    const ms = waitCount * 2.4 * (wlong ? 12 : 1);
    return {
      wtime: wtiming.wtime,
      wlong: wlong,
      waitCount: waitCount,
      milliseconds: ms,
    };
  }

  static toThreshold(low, high) {
    return Buffer.from([high, low]);
  }

  static parseThreshold(buffer) {
    const high = buffer.readUInt16LE(0);
    const low = buffer.readUInt16LE(2);
    return {
      high: high,
      low: high
    }
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
    return { apres: value }
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
    }
    return { apres: persistence.apres, persist: persist };
  }

  static toConfiguration(wlong) {
    return (WLONG);
  }

  static parseConfiguration(buffer) {
    const value = buffer[0];
    return { wlong: (value & WLONG) === WLONG };
  }

  static toControl(multiplyer) {
    let again;

    switch(multiplyer) {
    case 1: again = GAIN_X1; break;
    case 4: again = GAIN_X4; break;
    case 16: again = GAIN_X16; break;
    case 60: again = GAIN_X60; break;
    default: throw new Error('unknown multiplyer: ' + multiplyer);
    }

    return again;
  }

  static parseControl(buffer) {
    const value = buffer[0];
    const again = (value & AGAIN);
    return { again: again };
  }

  static formatControl(control) {
    let multiplyer;
    switch(control.again) {
    case GAIN_X1: multiplyer = 1; break;
    case GAIN_X4: multiplyer = 4; break;
    case GAIN_X16: multiplyer = 16; break;
    case GAIN_X60: multiplyer = 60; break;
    }

    return { again: control.again, multiplyer: multiplyer };
  }

  static parseStatus(buffer) {
    const value = buffer[0];
    return {
      aint: (value & AINT) === AINT,
      avalid: (value & AVALID) === AVALID
    };
  }

  static formatData(data) {
    return {
      r: data.r,
      g: data.g,
      b: data.b,
      c: data.c,
      red: data.r / data.c,
      green: data.g / data.c,
      blue: data.b / data.c,
      lux: Converter.calculateLux(data.r, data.g, data.b),
      tempature: Converter.calculateTempature(data.r, data.g, data.b)
    };
  }


  static calculateLux(r, g, b) {
    return (-0.32466 * r) + (1.57837 * g) + (-0.73191 * b);
  }

  static calculateTempature(r, g, b) {
    return NaN;
  }
}


module.exports.init = Tcs34725.init;
module.exports.CHIP_ID = TCS34725_I2C_PART_NUMBER;
module.exports.ADDRESS = TCS34725_I2C_ADDRESS;
