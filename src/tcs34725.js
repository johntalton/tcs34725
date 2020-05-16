
const { Common } = require('./common.js');
const { Converter } = require('./converter.js');
const {
  TCS34725_I2C_PART_NUMBER,
  TCS34725_I2C_ADDRESS
} = require('./defs.js');

/**
 *
 */
class Tcs34725 {
  static init(bus) {
    return Promise.resolve(new Tcs34725(bus));
  }

  constructor(bus) {
    this.bus = bus;
  }

  close() { return this.bus.close(); }

  id() { return Common._id(this.bus); }

  profile() { return Common._profile(this.bus); }
  status() { return Common._status(this.bus); }

  threshold() { return Common._threshold(this.bus); }
  setThreshold(low, high) {
    return Common.threshold(this.bus, Converter.toThreshold(low, high));
  }

  setProfile(profile) {
    if(profile.powerOn === undefined) { profile.powerOn = false; }
    if(profile.active === undefined) { profile.active = false; }
    if(profile.wait === undefined) { profile.wait = false; }
    if(profile.interrupts === undefined) { profile.interrupts = true; }
    if(profile.integrationTimeMs === undefined) { profile.integrationTimeMs = 0; }
    if(profile.waitTimeMs === undefined) { profile.waitTimeMs = 0; }
    if(profile.filtering === undefined) { profile.filtering = false; }
    if(profile.multiplier === undefined) { profile.multiplier = 1; }

    // console.log('set profile', profile);

    const enable = Converter.toEnable({
      AIEN: profile.interrupts,
      WEN: profile.wait,
      AEN: profile.active,
      PON: profile.powerOn
    });
    const timing = Converter.toTimingMs(profile.integrationTimeMs);
    const [wtiming, wlong] = Converter.toWTimingMs(profile.waitTimeMs);
    const threshold = Converter.toThreshold(profile.low, profile.high);
    const persistence = Converter.toPersistence(profile.filtering);
    const config = Converter.toConfiguration(wlong);
    const control = Converter.toControl(profile.multiplier);

    return Common.setProfile(this.bus, enable, timing, wtiming, threshold, persistence, config, control);
  }

  clearInterrupt() { return Common.clearInterrupt(this.bus); }

  data() { return Common.data(this.bus); }
}

module.exports = {
  Tcs34725: Tcs34725,
  Converter: Converter,
  CHIP_ID: TCS34725_I2C_PART_NUMBER,
  ADDRESS: TCS34725_I2C_ADDRESS
};
