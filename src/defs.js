

const TCS34725_I2C_ADDRESS = 0x29;
const TCS34725_I2C_PART_NUMBER = 0x44; // TCS34721 and TCS34725
// const TCS_I2C_PART_NUMBER = 0x4D // TCS34723 and TCS34727

// just shorthand
const CHIP_ID = TCS34725_I2C_PART_NUMBER;
const ADDRESS = TCS34725_I2C_ADDRESS;

// Device registers by name
const Registers = {
  ENABLE: 0x00,
  ATIME: 0x01,
  WTIME: 0x03,

  AILTL: 0x04,
  AILTH: 0x05,
  AIHTL: 0x06,
  AIHTH: 0x07,

  PERS: 0x0C,
  CONFIG: 0x0D,
  CONTROL: 0x0F,
  
  ID: 0x12,
  
  STATUS: 0x13,

  // We use data block bellow instead
  CDATAL: 0x14,
  CDATAH: 0x15,
  RDATAL: 0x16,
  RDATAH: 0x17,
  GDATAL: 0x18,
  GDATAH: 0x19,
  BDATAL: 0x1A,
  BDATAH: 0x1B
};

// Register to start block read for Data
const DATA_BLOCK_START_REGISTER = Registers.CDATAL;
// Register to start block read for Threshold
const THRESHOLD_BLOCK_START_REGISTER = Registers.AILTL;
// Register to start block read for Profile
const PROFILE_BLOCK_START_REGISTER = Registers.ENABLE;


const CommandTypes = {
  REPEATED_BYTE_PROTOCOL: 0b00,
  AUTO_INCREMENT_PROTOCOL: 0b01,
  RESERVED_1: 0b10,
  SPECIAL: 0b11
};

const SpecialFunctions = {
  CLEAR: 0b00110
};

// Mask address but to indicate this is a Command
const TCS34725_COMMAND_BIT = 0x80;

function makeCommand(addressOrSpecialFunction, type = CommandTypes.REPEATED_BYTE_PROTOCOL, command = true) {
  // console.log('makeCommand', addressOrSpecialFunction, type, command);
  if(addressOrSpecialFunction === undefined) { throw Error('undefined addressOrSpecialFunction'); }
  return addressOrSpecialFunction | (type << 5) | (command ? TCS34725_COMMAND_BIT : 0);
}

// Clear channel interrupt clear
const COMMAND_CLEAR = makeCommand(SpecialFunctions.CLEAR, CommandTypes.SPECIAL);
const COMMAND_BULK_DATA = makeCommand(DATA_BLOCK_START_REGISTER, CommandTypes.AUTO_INCREMENT_PROTOCOL);
const COMMAND_BULK_PROFILE = makeCommand(PROFILE_BLOCK_START_REGISTER, CommandTypes.AUTO_INCREMENT_PROTOCOL);
const COMMAND_BULK_THRESHOLD = makeCommand(THRESHOLD_BLOCK_START_REGISTER, CommandTypes.AUTO_INCREMENT_PROTOCOL);

// Named 8-bit mask 
const Masks = {
  STATUS_AINT: 0b00010000,
  STATUS_AVALID: 0b00000001,
  CONTROL_AGAIN: 0b00000011,
  CONFIG_WLONG: 0b00000010,
  PRES_APRES: 0b00001111,
  ENABLE_PON : 0x01,
  ENABLE_AEN : 0x02,
  ENABLE_WEN : 0x08,
  ENABLE_AIEN: 0x10
};

// Enumerations and their building blocks

const GAIN_X1 =  0b00;
const GAIN_X4 =  0b01;
const GAIN_X16 = 0b10;
const GAIN_X60 = 0b11;

const GAIN_ENUM_MAP = [
  { name: 1, value: GAIN_X1 },
  { name: 4, value: GAIN_X4 },
  { name: 16, value: GAIN_X16 },
  { name: 60, value: GAIN_X60 }
];

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

const Enumerations = {
  APRES_ENUM_MAP,
  GAIN_ENUM_MAP
};

const DEFAULT_CHIP_PROFILE = {
  powerOn: false,
  active: false,
  wait: false,
  interrupts: false,

  integrationTimeMs: 2.4,
  waitTimeMs: 2.4,
  // waitTime: { waitCount: 1, waitLong: false },

  // threshold: { low: 0, high: 0 },
  low: 0, high: 0,

  filtering: true, // true is Every

  // no config (wlong is part of waitTime)
  // todo provide direct waitCount and waitLong access

  gain: 1
};


module.exports = {
  TCS34725_I2C_ADDRESS,
  TCS34725_I2C_PART_NUMBER,
  TCS34725_COMMAND_BIT,
  makeCommand,
  COMMAND_CLEAR, COMMAND_BULK_DATA, COMMAND_BULK_PROFILE, COMMAND_BULK_THRESHOLD,
  Registers,
  Enumerations,
  Masks,

  DEFAULT_CHIP_PROFILE
};
