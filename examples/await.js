
const { Tcs34725 } = require('../');

async function foo() {
  const bus = {};
  const sensor = await Tcs34725.init(bus);
  const data = await sensor.data();
}

foo();
