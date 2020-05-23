/* eslint-disable max-classes-per-file */

const { I2CAddressedBus, I2CMockBus } = require('@johntalton/and-other-delights');
const { Tcs34725 } = require('..');

const tcsDeviceDef = {
  commandMask: 0x1F, // ~(0x80 | 0x60),

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

I2CMockBus.addDevice(1, 0x29, tcsDeviceDef)

const busNumber = 1;
const busAddress = 0x29;

I2CMockBus.openPromisified(busNumber)
  .then(bus => new I2CAddressedBus(bus, busAddress))
  .then(bus => Tcs34725.init(bus))
  .then(tcs => {
    return tcs.setProfile({
      powerOn: true,
      active: true,
      integrationTimeMs: 24,
      wait: true,
      waitTimeMs: 2 * 1000,
      gain: 4,
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

