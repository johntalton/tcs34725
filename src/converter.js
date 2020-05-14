
const { NameValueUtil } = require('@johntalton/and-other-delights');

// TODO bellow are  const and should be removed
const AINT =   0b00010000;
const AVALID = 0b00000001;

const WLONG = 0b00000010;


const AGAIN = 0b00000011;
const GAIN_X1 =  0b00;
const GAIN_X4 =  0b01;
const GAIN_X16 = 0b10;
const GAIN_X60 = 0b11;


const APRES = 0b00001111;

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

const APRES_ENUM_MAP = [
  { name: true, value: APRES_EVERY },
  { name: false, value: APRES_EVERY },
  { name: 0, value: APRES_EVERY },
  { name: 1, value: APRES_1 },
  { name: 2, value: APRES_2 },
  { name: 3, value: APRES_3 },
  { name: 5, value: APRES_5 },
  { name: 10, value: APRES_10 },
  { name: 15, value: APRES_15 },
  { name: 20, value: APRES_20 },
  { name: 25, value: APRES_25 },
  { name: 30, value: APRES_30 },
  { name: 35, value: APRES_35 },
  { name: 40, value: APRES_40 },
  { name: 45, value: APRES_45 },
  { name: 50, value: APRES_50 },
  { name: 55, value: APRES_55 },
  { name: 60, value: APRES_60 }
];

const PON  = 0x01;
const AEN  = 0x02;
// reserved  0x04;
const WEN  = 0x08;
const AIEN = 0x10;

/**
 *
 */
class Converter {
  /**
   *
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

    if(waitCount > 256) { throw new Error('milliseconds out of range: ' + ms); }
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
    const item = APRES_ENUM_MAP.find(({ name, value }) => name === persistence);
    if(item === undefined) { throw Error('unknown persistence: ' + persistence); }
    return item.value;
 }

  static parsePersistence(buffer) {
    const value = buffer[0] & APRES;
    return { apres: value };
  }

  static formatPersistence(persistence) {
    return NameValueUtil.toName(persistence.apres, APRES_ENUM_MAP);

    // const item = APRES_ENUM_MAP.find(({ name, value }) => value === persistence);
    // if(item === undefined) { throw Error('unknown persistence:' + persistence); }
    // return { apres: persistence.apres, persist: item.name };
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

    // software scaling?
    // pow(raw.r / raw.c, scaling) * 255.0;
    // clr.g = pow((float)raw_data.g / (float)raw_data.c, scaling) * 255.f;
    // clr.b = pow((float)raw_data.b / (float)raw_data.c, scaling) * 255.f;

    const red = raw.r / raw.c;
    const green = raw.g / raw.c;
    const blue = raw.b / raw.c;

    //const r = Math.trunc(Math.pow(Math.trunc(red * 256) / 255, 2.5) * 255);
    //const g = Math.trunc(Math.pow(Math.trunc(green * 256) / 255, 2.5) * 255);
    //const b = Math.trunc(Math.pow(Math.trunc(blue * 256) / 255, 2.5) * 255);

    const r = Math.trunc(red * 255);
    const g = Math.trunc(green * 255);
    const b = Math.trunc(blue * 255);

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
    const cct = 449.0 * Math.pow(n, 3) +
                3525.0 * Math.pow(n, 2) +
                6823.3 * n +
                5520.33;

    return { lux: y, tempatureK: cct };
  }
}

module.exports = { Converter };
