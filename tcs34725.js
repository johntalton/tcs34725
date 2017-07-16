
var i2c = require('i2c');

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

  const PON  = 0x01;
  const AEN  = 0x02;
  // reserved  0x04;
  const WEN  = 0x08;
  const AIEN = 0x10;

class Tcs34725 {
 static init(){
    const bus = new i2c(TCS34725_I2C_ADDRESS, {device: '/dev/i2c-1'});
    return Promise.resolve(new Tcs34725(bus)); 
  }

  constructor(bus) {
    this.bus = bus;
  }

  id() {
    return new Promise((resolve, reject) => {
      this.bus.readBytes(0x80 | 0x12, 1, function(e, buf){
        // console.log(e, buf);
        
        if(e !== null){ reject(e); return; }
        const id = buf.readUInt8(0);
        resolve(id);
      });
    });
  }

  enable() {}
  atime() {}
  wtime() {}





}

module.exports.init = Tcs34725.init;
module.exports.CHIP_ID = TCS34725_I2C_PART_NUMBER;
