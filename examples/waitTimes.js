
const { Converter } = require('..');

[
     2.4,
    24,
    29,
    43.2,
   101,
   154,
   204,
   614,
   700,
  2450,
  7000,
  7370,
  7400
].forEach(requesteWaitTimeMs => {
  const [wtime, wlong] = Converter.toWTimingMs(requesteWaitTimeMs);
  const register = Buffer.from([wtime])
  const waitTiming = Converter.parseWaitTiming(register);
  const waitTimingFull = Converter.formatWaitTiming(waitTiming, wlong);
  console.log(requesteWaitTimeMs, '=>', register, waitTiming.waitCount, '=>',  Math.trunc(waitTimingFull.waitTimeMs * 100) / 100, wlong ? '*' :'');
});
