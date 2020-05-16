/* eslint-disable max-classes-per-file */

const { I2CAddressedBus } = require('@johntalton/and-other-delights');
const { Tcs34725 } = require('..');

const tcsDeviceDef = {
  commandMask: 0x7F,

  profile: {
    powerOn: { ref: 'PON' },
    active: { ref: 'AEN' },
    interrupts: { ref: 'AIEN' },
    wait: { ref: 'WEN' },
    waitTime: {}, // todo
    integrationTime: {}, // todo
    threshold: {
      low: { int16bit: ['AILTH', 'AILTL'] },
      high: { int16bit: ['AIHTH', 'AIHTL'] }
    },
    filtering: { ref: 'APRES' },
    gain: { ref: 'AGAIN' },

    valid: { ref: 'AVALID' },
    thresholdViolation: { ref: 'AINT' }
  },

  data: {},

  register: {
    0x00: { 
      name: 'ENABLE',
      properties: {
        'AIEN': { bit: 4 },
        'WEN': { bit: 3 },
        'AEN': { bit: 1 },
        'PON': { bit: 0 }
      }
    },
    0x01: { name: 'ATIME' },
    0x03: { name: 'WTIME' },
    0x04: { name: 'AILTL' },
    0x05: { name: 'AILTH' },
    0x06: { name: 'AIHTL' },
    0x07: { name: 'AIHTH' },
    0x0c: {
      name: 'PRES',
      properties: {
        'APRES': { bits: [3, 0], enum: {} }
      }
    },
    0x0d: { 
      name: 'CONFIG',
      properties: {
        'WLONG': { bit: 1 }
      }
    },
    0x0f: {
      name: 'CONTROL',
      properties: {
        'AGAIN': { bits: [1, 0], enum: {} }
      }
    },
    0x12: { nanme: 'ID', readOnly: true, data: 0x44, enum: {} },
    0x13: {
      name: 'STATUS', 
      readOnly: true,
      properties: {
        'AINT': { bit: 4 }, 
        'AVALID': { bit: 0 } 
      }
    },

    0x14: { name: 'CDATA', data: 100 },
    0x15: { name: 'CDATAH', data: 0 },
    0x16: { name: 'RDATA', data: 50 },
    0x17: { name: 'RDATAH', data: 0 },
    0x18: { name: 'GDATA', data: 25 },
    0x19: { name: 'GDATAH', data: 0 },
    0x1A: { name: 'BDATA', data: 0 },
    0x1B: { name: 'BDATAH', data: 0 }
  }

};

class MockRegister {
  constructor(key, options) { this.key = key; this.options = options; }
  get valid() { return this.key !== undefined; }
  get name() { return this.options.name; }
  get readOnly() { return this.options.readOnly; }
  get data() { return this.options.data; }
  set data(data) { this.options.data = data; }
}

class MockRegisterDefinition {
  constructor(definition) {
    this.definition = definition;
    Object.keys(this.definition.register).forEach(key => {
      this.definition.register[key].client = new MockRegister(key, this.definition.register[key]);
    });
  }

  get commandMask() { return this.definition.commandMask; }


  register(register) {
    if(this.definition.register[register.toString()] === undefined) { return new MockRegister(); }
    // console.log(this.definition.register[register.toString()].client.valid);
    return this.definition.register[register.toString()].client;
  }
}

class MockDevice {
  constructor(busAddress, deviceDef) {
    this.busAddress = busAddress;
    this.definition = new MockRegisterDefinition(deviceDef);
  }
  
  register(register) {
    return this.definition.register(register);
  }

  writeI2cBlock(address, command, length, buffer) {
    // console.log('Mock Write', address.toString(16), command.toString(16), buffer);

    const maskedCommand = command & this.definition.commandMask;
    
    [...buffer].filter((_, index) => index < length).forEach((item, index) => {
      if(!this.register(maskedCommand + index).valid) { console.log('invalid write address', maskedCommand, index); return; }
      if(this.register(maskedCommand + index).readOnly === true) { console.log('readOnly'); return; }
      this.register(maskedCommand + index).data = item;
    });
    const bytesWriten = length;
    return Promise.resolve({ bytesWriten, buffer });
  }

  readI2cBlock(address, command, length) {
    // console.log('Mock Read', address.toString(16), command.toString(16), length);

    const maskedCommand = command & this.definition.commandMask;
 
    const buffer = Buffer.alloc(length);
    [...new Array(length)].forEach((_, index) => {
      if(!this.register(maskedCommand + index).valid) { console.log('invalid read address'); return; }
      buffer[index] = this.register(maskedCommand + index).data;
    });
    const bytesRead = buffer.length;
    return Promise.resolve({ bytesRead, buffer });
  }
}

class MockBus {
  constructor(busNumber) {
    this.busNumber = busNumber;
  }

  static addDevice(bus, address, device) {
    if(MockBus.addressMap === undefined) { MockBus.addressMap = {}; }
    if(MockBus.addressMap[bus] === undefined){ MockBus.addressMap[bus] = {}; }
    MockBus.addressMap[bus][address] = device;
  }

  static openPromisified(busNumber) {
    return Promise.resolve(new MockBus(busNumber));
  }

  writeI2cBlock(address, command, length, buffer) {
    return MockBus.addressMap[this.busNumber][address].writeI2cBlock(address, command, length, buffer);
  }

  readI2cBlock(address, command, length) {
    return MockBus.addressMap[this.busNumber][address].readI2cBlock(address, command, length);
  }
}

MockBus.addDevice(1, 0x29, new MockDevice(0x29, tcsDeviceDef))

const busNumber = 1;
const busAddress = 0x29;

MockBus.openPromisified(busNumber)
  .then(bus => new I2CAddressedBus(bus, busAddress))
  .then(bus => Tcs34725.init(bus))
  .then(tcs => {
    return tcs.setProfile({
      powerOn: true,
      active: true,
      integrationTimeMs: 24,
      wait: true,
      waitTimeMs: 2 * 1000,
      multiplier: 4,
      filtering: 30,
      interrupts: true,
      low: 280,
      high: 290
    })
    .then(() => tcs.profile().then(console.log))
    .then(() => {
      return tcs.data().then(console.log);
    });
  })
  .catch(e => console.log('top-level error', e));

