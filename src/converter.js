const { NameValueUtil } = require('@johntalton/and-other-delights');

const { Enumerations, Masks } = require('./defs.js');

/**
 *
 */
class Converter {

  static formatWaitTiming(waitTiming, wlong) {
    // docs suggest twos compliment encoded value
    const waitTimeMs = waitTiming.waitCount * 2.4 * (wlong ? 12 : 1);
    return {
      ...waitTiming,
      _wlong: wlong,
      waitTimeMs
    };
  }

  // ---------------------------------------------------------------------------

  static parseEnable(buffer) {
    const value = buffer.readInt8(0);

    return {
      powerOn: (value & Masks.ENABLE_PON) === Masks.ENABLE_PON,
      active: (value & Masks.ENABLE_AEN) === Masks.ENABLE_AEN,
      wait: (value & Masks.ENABLE_WEN) === Masks.ENABLE_WEN,
      interrupts: (value & Masks.ENABLE_AIEN) === Masks.ENABLE_AIEN
    };
  }

  static parseWaitTiming(buffer) {
    const _wtime = buffer.readUInt8(0);
    const waitCount = 256 - _wtime;
    return {
      _wtime,
      waitCount
    };
  }

  static parseIntegrationTiming(buffer) {
    const _atime = buffer.readUInt8(0);

    const integrationCycles = 256 - _atime;
    const integrationMaxCount = integrationCycles * 1024;
    const integrationTimeMs = integrationCycles * 2.4;
    return {
      _atime,
      integrationCycles,
      integrationMaxCount,
      integrationTimeMs
    };
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
    const apres = buffer[0] & Masks.PRES_APRES;
    return { apres };
  }

  static parseConfiguration(buffer) {
    const value = buffer.readInt8(0);
    return { wlong: (value & Masks.CONFIG_WLONG) === Masks.CONFIG_WLONG };
  }


  static parseStatus(buffer) {
    const value = buffer.readInt8(0);
    const aint = (value & Masks.STATUS_AINT) === Masks.STATUS_AINT;
    const avalid = (value & Masks.STATUS_AVALID) === Masks.STATUS_AVALID;
    return {
      valid: avalid,
      thresholdViolation: aint
    };
  }

  static parseControl(buffer) {
    const value = buffer.readInt8(0);
    const again = value & Masks.CONTROL_AGAIN;
    return { again: again };
  }

  // ---------------------------------------------------------------------------

  static toEnable(enable) {
    return (enable.interrupts ? Masks.ENABLE_AIEN : 0) |
           (enable.wait ? Masks.ENABLE_WEN : 0) |
           (enable.active ? Masks.ENABLE_AEN : 0) |
           (enable.powerOn ? Masks.ENABLE_PON : 0);
  }

  static toTimingMs(ms) {
    const count = Math.floor(ms / 2.4);
    if(count > 256) { throw new Error('timing ms out of range: ' + ms); }
    return 256 - count;
  }

  static toWTimingMs(ms, requestedWaitLong) {
    const MAX_STEPS = 256;
    const STEP_UNIT_SIZE_MS = 2.4;
    const LONG_STEP_MULTIPLIER = 12;

    const LONG_STEP_MS = LONG_STEP_MULTIPLIER * STEP_UNIT_SIZE_MS;
    const STEP_MS = STEP_UNIT_SIZE_MS;

    const RANGE = { low: STEP_MS, high: MAX_STEPS * STEP_MS };
    const LONG_RANGE = { low: LONG_STEP_MS, high: MAX_STEPS * LONG_STEP_MS };

    // continue using the higher resolution timing calculation
    // until it is no-longer in range.  Then switch to the 12x.
    // todo this choice can be used for fingerprinting
    let assumedWlong = false;
    if(ms > RANGE.high) {
      // console.log('out of one x range, twellve x');
      assumedWlong = true;
    }

    const waitCount = Math.trunc(ms / (assumedWlong ? LONG_STEP_MS : STEP_MS));
    if((waitCount <= 0) || (waitCount > 256)) { throw new Error('invlaid wait count: ' + waitCount); }
    return [Converter.toWTimingCount(waitCount), assumedWlong];
  }

  static toWTimingCount(count) {
    if(count < 0 || count > 256) { throw new Error('count out of range: ' + count); }
    return 256 - count;
  }

  static toThreshold(threshold) {
    const { low, high } = threshold;
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

  static toControl(gain) {
    return NameValueUtil.toValue(gain, Enumerations.GAIN_ENUM_MAP);
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

    // const r = Math.trunc(Math.pow(Math.trunc(red * 256) / 255, 2.5) * 255);
    // const g = Math.trunc(Math.pow(Math.trunc(green * 256) / 255, 2.5) * 255);
    // const b = Math.trunc(Math.pow(Math.trunc(blue * 256) / 255, 2.5) * 255);

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
