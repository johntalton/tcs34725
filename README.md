# tcs34725

[![npm Version](http://img.shields.io/npm/v/@johntalton/tcs34725.svg)](https://www.npmjs.com/package/@johntalton/tcs34725)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/tcs34725)
![CI](https://github.com/johntalton/tcs34725/workflows/CI/badge.svg?branch=master&event=push)
![GitHub](https://img.shields.io/github/license/johntalton/tcs34725)
[![Downloads Per Month](http://img.shields.io/npm/dm/@johntalton/tcs34725.svg)](https://www.npmjs.com/package/@johntalton/tcs34725)
![GitHub last commit](https://img.shields.io/github/last-commit/johntalton/tcs34725)

TAOS Color-light sensor.
Supporting full set of device features.

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
##### ```setThreshold```
##### ```setProfile```
##### ```clearInterrupt```
##### ```data```



## REPL

Exmple repl used to interact with sensor and show basic usage. Can be used along side client to help configure and debug sensor.

## Client

Example client that can be configured to stream to Mqtt server.  Optimizes sensor interaction based on application state (aka, no need to poll if mqtt connection is down, fully iterrupt driven if desired etc).

Also support interrupt stepping.  This allows the client to only publish step ranges based on interrupt to eliminate the need to do active polling (with ability to mix modes for custom configurations).

By using a mixture of polling / stepping / interruts and filtering one can achive a vast array of chip interaction models. But also works quite well without Gpio access.


# Interrupt

Requiers gpio pin (via onoff currently) to driver interrupt (polled software interrupt also possible if pin not availble).

# LED

Adafruit LED (breakout) supported also via gpio control.  Poll can be setup to automaticly flash the LED during each manual poll.
