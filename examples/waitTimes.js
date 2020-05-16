
const { Converter } = require('..');

[
     2.4,
    29,
   204,
   614,
  2450,
  7000
 // 7400
].forEach(requesteWaitTimeMs => {
  const [wtiming, wlong] = Converter.toWTimingMs(requesteWaitTimeMs);
  const wTimeMs = Converter.formatWTiming({ wtime: wtiming }, wlong);
  console.log(requesteWaitTimeMs, '0x' + wtiming.toString(16), wlong, wTimeMs.waitCount, wTimeMs.milliseconds);
});
