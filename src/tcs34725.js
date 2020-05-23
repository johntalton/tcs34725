
const { Common } = require('./common.js');
const { Converter } = require('./converter.js');
const {
  TCS34725_I2C_PART_NUMBER,
  TCS34725_I2C_ADDRESS,
  DEFAULT_CHIP_PROFILE
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
  setThreshold(threshold) { return Common.threshold(this.bus, threshold); }

  setProfile(profile) {
    const profileExploded = { ...DEFAULT_CHIP_PROFILE, ...profile};
    return Common.setProfile(this.bus, profileExploded);
  }

  clearInterrupt() { return Common.clearInterrupt(this.bus); }

  data() { return Common.data(this.bus); }
}

Tcs34725.CHIP_ID = TCS34725_I2C_PART_NUMBER;

module.exports = {
  Tcs34725: Tcs34725,
  Converter: Converter,
  CHIP_ID: TCS34725_I2C_PART_NUMBER,
  ADDRESS: TCS34725_I2C_ADDRESS
};
