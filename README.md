# tcs34725

TAOS Color-light sensor.  
Supporting full set of device features.

[Adafruit ofcourse](https://www.adafruit.com/product/1334)

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
