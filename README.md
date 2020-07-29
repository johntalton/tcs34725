[![npm Version](http://img.shields.io/npm/v/@johntalton/tcs34725.svg)](https://www.npmjs.com/package/@johntalton/tcs34725)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/tcs34725)
![CI](https://github.com/johntalton/tcs34725/workflows/CI/badge.svg?branch=master&event=push)
![CodeQL](https://github.com/johntalton/tcs34725/workflows/CodeQL/badge.svg)
![GitHub](https://img.shields.io/github/license/johntalton/tcs34725)
[![Downloads Per Month](http://img.shields.io/npm/dm/@johntalton/tcs34725.svg)](https://www.npmjs.com/package/@johntalton/tcs34725)
![GitHub last commit](https://img.shields.io/github/last-commit/johntalton/tcs34725)
[![Package Quality](https://npm.packagequality.com/shield/%40johntalton%2Ftcs34725.svg)](https://packagequality.com/#?package=@johntalton/tcs34725)

# tcs34725

TAOS Color-light sensor.

This sensor provides and RGB plus intensit result.  It can be accessed via the normal read process or via interrupts based on intensity thresholds.  A wide range of setting and features are exposed by this library.

[Adafruit ofcourse](https://www.adafruit.com/product/1334)

## API

### ```Tcs34725```

Primary interface method for accessing the sensor and factory for creating class instances.

example usage:

```javascript
const sensor = await Tcs34725.init(i2cbus);
const color = await sensor.data();
```

##### ```static init```

Pass and I2CBus compliant implementation as a parameter.
Returns a instance of this class.

##### ```close```

Closes the device and bus instance.

##### ```id```

Retrives the chips ID.

##### ```profile```

Retrives full profile, including status, from the chip.

##### ```status```

Retrives status flag, including ```thresholdViolation``` and ```valid```.

If ```thresholdViolation``` is true, then the chips clear channel has excided the


##### ```threshold```

Retrives the current set thresholds for interrupts.

##### ```setThreshold```

Sets new threshold values to be used for interrupt triggering.

##### ```setProfile```

Set a new profile for the chip.

##### ```clearInterrupt```

Manually clears the interrupt flag on the chip.  Note that if conditions for the interrupt continue to exists, the chip will imidiatly re-assert the interrupt flag.

##### ```data```

Retrives rag data from the chip and performes RGBC convertions.


# Interrupt

Interrupts are driven via a seperate Gpio driver ([onoff](../fivdi/onoff) is well tested).  Though any mechanisme of detection is supported.

Once an interrupt has been raised, clear it via normal read methods. Note that it will continue to be rased if the alert condition persists.

Thresholds can be updated via the `setThreshold` call.

Interrupt state can also be manually cleared via `clearInterrupt`.

# LED

Adafruit LED (breakout) supported also via gpio control.  The [onoff](../fivdi/onoff) library can be used to control this features.

No specific code is needed via this library to support this external feature.
