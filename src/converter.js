
const { NameValueUtil } = require('@johntalton/and-other-delights');

const { Enumerations, Masks } = require('./defs.js');

/**
 *
 */
class Converter {
  /**
   * @param enable An object with PON, AEN, AIEN and WEN property.
   * @param timing A value representing integration time.
   * @param wTiming A scalar value associated with the `config.wLong` setting.
   * @param threshold An object with `high` and `low` properties.
   * @param persistence Value for persistence.
   * @param config An object with `wLong` property.
   * @param control Gain value.
   * @param status An object with `aValid and `aInt` properties.
   * @returns A friendly named - formatted -  object to use at a high level.
   **/
  static formatProfile(enable, timing, wTiming, threshold, persistence, config, control, status) {
    return {
      powerOn: enable.PON,
      active: enable.AEN,
      interrupts: enable.AIEN,
      wait: enable.WEN,
      waitTime: Converter.formatWTiming(wTiming, config.wlong),
      integrationTime: Converter.formatTiming(timing),
      threshold: { low: threshold.low, high: threshold.high },
      filtering: Converter.formatPersistence(persistence),
      gain: Converter.formatControl(control),

      valid: status.avalid,
      thresholdViolation: status.aint
    };
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

  static formatPersistence(persistence) {
    return NameValueUtil.toName(persistence.apres, Enumerations.APRES_ENUM_MAP);
  }

  static formatControl(control) {
    const multiplier = NameValueUtil.toName(control.again, Enumerations.GAIN_ENUM_MAP);
    return { again: control.again, multiplier: multiplier };
  }

  // ---------------------------------------------------------------------------

  static parseEnable(buffer) {
    const value = buffer.readInt8(0);

    return {
      AIEN: (value & Masks.ENABLE_AIEN) === Masks.ENABLE_AIEN,
      WEN: (value & Masks.ENABLE_WEN) === Masks.ENABLE_WEN,
      AEN: (value & Masks.ENABLE_AEN) === Masks.ENABLE_AEN,
      PON: (value & Masks.ENABLE_PON) === Masks.ENABLE_PON
    };
  }

  static parseWTiming(buffer) {
    const value = buffer.readInt8(0);
    return { wtime: value };
  }

  static parseTiming(buffer) {
    const value = buffer.readInt8(0);
    return { atime: value };
  }


  static parseThreshold(buffer) {
    const low = buffer.readUInt16LE(0);
    const high = buffer.readUInt16LE(2);
    return {
      low: low,
      high: high
    };
  }

  static parsePersistence(buffer) {
    const value = buffer[0] & Masks.PRES_APRES;
    return { apres: value };
  }

  static parseConfiguration(buffer) {
    const value = buffer.readInt8(0);
    return { wlong: (value & Masks.CONFIG_WLONG) === Masks.CONFIG_WLONG };
  }


  static parseStatus(buffer) {
    const value = buffer.readInt8(0);
    return {
      aint: (value & Masks.STATUS_AINT) === Masks.STATUS_AINT,
      avalid: (value & Masks.STATUS_AVALID) === Masks.STATUS_AVALID
    };
  }

  static parseControl(buffer) {
    const value = buffer.readInt8(0);
    const again = value & Masks.CONTROL_AGAIN;
    return { again: again };
  }

  // ---------------------------------------------------------------------------

  static toEnable(enable) {
    return (enable.AIEN ? Masks.ENABLE_AIEN : 0) |
           (enable.WEN ? Masks.ENABLE_WEN : 0) |
           (enable.AEN ? Masks.ENABLE_AEN : 0) |
           (enable.PON ? Masks.ENABLE_PON : 0);
  }

  static toTimingMs(ms) {
    const count = Math.floor(ms / 2.4);
    if(count > 256) { throw new Error('timing ms out of range: ' + ms); }
    return 256 - count;
  }

  static toWTimingMs(ms) {
    let assumedWlong = false;
    let waitCount = Math.round(ms / 2.4);

    if(ms > 256) {
      // assume wLong true desired
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

  
  static toThreshold(low, high) {
    return [
      low & 0xFF, low >> 8 & 0xFF,
      high & 0xFF, high >> 8 & 0xFF
   ];
  }

  static toPersistence(persistence) {
     return NameValueUtil.toValue(persistence, Enumerations.APRES_ENUM_MAP);
 }

  static toConfiguration(wlong) {
    return wlong ? Masks.CONFIG_WLONG : 0;
  }

  static toControl(multiplier) {
    return NameValueUtil.toValue(multiplier, Enumerations.GAIN_ENUM_MAP);
  }

  // ---------------------------------------------------------------------------

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
    // r = pow(raw.r / raw.c, scaling) * 255.0;
    // g = pow(raw.g / raw.c, scaling) * 255.0;
    // b = pow(raw.b / raw.c, scaling) * 255.0;

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
