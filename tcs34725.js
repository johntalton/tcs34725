

  const TCS34725_I2C_ADDRESS = 0x29; // TCS34725
  const TCS34725_I2C_PART_NUMBER = 0x44 // TCS34721 and TCS34725
  // const TCS_I2C_PART_NUMBER = 0x4D // TCS34723 and TCS34727

  const TCS34725_COMMAND_BIT = 0x80;

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

  const PROFILE_BLOCK_READ_START_REGISTER = 0x00;

  const PON  = 0x01;
  const AEN  = 0x02;
  // reserved  0x04;
  const WEN  = 0x08;
  const AIEN = 0x10;

class Tcs34725 {
  static init(bus){
    return Promise.resolve(new Tcs34725(bus));
  }

  constructor(bus) {
    this.bus = bus;
  }

  id() {
    return this.bus.read(ID_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      const id = buffer.readUInt8(0);
      //console.log(buffer, id);
      return id;
    });
  }

  _enable() {
    return this.bus.read(ENABLE_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
    // return this.bus.read(0x80, 1).then(buffer => {
      console.log('_enable', buffer);
      return Converter.parseEnable(buffer[0]);
    });
  }

  _timing() {
    return this.bus.read(ATIME_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      console.log(buffer);
      return Converter.parseTiming(buffer[0]);
    });
  }

  _wtiming() {
    return this.bus.read(WTIME_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      console.log(buffer);
      return Converter.parseWTiming(buffer[0]);
    });
  }


  _threshold() {
    return this.bus.read(AILTL_REGISTER | TCS34725_COMMAND_BIT, 4).then(buffer => {
      console.log(buffer);
      return Converter.parseThreshold(buffer.readUInt16LE(0), buffer.readUInt16LE(2));
    });
  }

  _persistence() {
    return this.bus.read(PERS_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      console.log(buffer);
      return Converter.parsePersistence(buffer[0]);
    });
  }

  _config() {
    return this.bus.read(CONFIG_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      console.log(buffer);
      return Converter.parseConfiguration(buffer[0]);
    });
  }

  _control() {
    return this.bus.read(CONTROL_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      console.log(buffer);
      return Converter.parseControl(buffer[0]);
    });
  }

  _status() {
    return this.bus.read(STATUS_REGISTER | TCS34725_COMMAND_BIT, 1).then(buffer => {
      console.log(buffer);
      return Converter.parseStatus(buffer[0]);
    });
  }


  profile() {
    return Promise.all([
      this._enable(),
      this._timing(),
      this._wtiming(),
      this._threshold(),
      this._persistence(),
      this._config(),
      this._control(),
      this._status()
    ]).then(parts => {
      console.log(parts);
      const [enable, timing, wtiming, threshold, persistence, config, control, status] = parts;
      return Converter.formatProfile(enable, timing, wtiming, threshold, persistence, config, control, status);
    });
  }

  profileBulk() {
    return this.bus.read(PROFILE_BLOCK_READ_START_REGISTER | TCS34725_COMMAND_BIT, 20).then(buffer => {
      console.log(buffer);

      const enable = Converter.parseEnable(buffer.readUInt8(0));
      const timing = Converter.parseTiming(buffer.readUInt8(1));
      const wtiming = Converter.parseWTiming(buffer.readUInt8(3));
      const threshold = Converter.parseThreshold(buffer.readInt16LE(4), buffer.readInt16LE(6));

      const persistence = Converter.parsePersistence(buffer.readUInt8(13));
      const config = Converter.parseConfiguration(buffer.readUInt8(14));
      const control = Converter.parseControl(buffer.readUInt8(16))
      const status = Converter.parseStatus(buffer.readUInt8(19));

      console.log(enable, timing);

      return Converter.formatProfile(enable, timing, wtiming, threshold, persistence, config, control, status);
    });
  }

  powerOn(on) {
    const enable = Converter.toEnable({ AIEN: false, WEN: false, AEN: false, PON: true });
    console.log('value', enable);
    // return this.bus.write(ENABLE_REGISTER | TCS34725_COMMAND_BIT, enable);
    return this.bus.write(0x80, 1);
  }

  timing() {}
  waittime() {}


  config() {}
  control() {}

  status() {
    return { valid: false, int: false };
  }

}

class Converter {
  static formatProfie(enable, timing, wtiming, threshold, persistence, config, control, status) {
      return {
        powerOn: enable.PON,
        enabled: enable.AEN,
        interupts: enable.AIEN,
        wait: enable.WEN,
        wiatTime: wtiming.wtime,
        integrationTime: timing.atime,
        thresholdHigh: threshold.high,
        thresholdLow: threshold.low,
        filtering: persistence.apres,
        gain: control.again,

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

  static parseEnable(value) {
    // console.log('parse enable', value);
    return {
      AIEN: (value & AIEN) === AIEN,
      WEN: (value & WEN) === WEN,
      AEN: (value & AEN) === AEN,
      PON: (value & PON) === PON
    };
  }

  static parseTiming(value) {
    const atime = value;
    const maxCount = (256 - atime) * 1024;
    const millisecond = maxCount * 2.4;
    return {
      atime: atime,
      maxCount: maxCount,
      millisecond: millisecond
    };
  }

  static parseWTiming(value) {
    return { wtime: value };
  }

  static parseThreshold(high, low) {
    return {
      high: high,
      low: high
    }
  }

  static parsePersistence(value) {
    return { apres: value };
  }

  static parseConfiguration(value) {
    return { wlong: value };
  }

  static parseControl(value) {
    return { again: value };
  }

  static parseStatus(value) {
    return {
      aint: value,
      avalid: value
    };
  }
}


module.exports.init = Tcs34725.init;
module.exports.CHIP_ID = TCS34725_I2C_PART_NUMBER;
