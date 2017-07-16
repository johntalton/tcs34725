'use stict';

var readline = require('readline');

const Tcs34725 = require('./tcs34725.js'); 

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


let commandHandler;

function prompt() {
  rl.question('tcs34725@i2c> ', commandHandler);
}

function _commandHandler(tcs, cmd) {
  if(cmd.toLowerCase() === 'id'){
    tcs.id().then(id => {
      console.log('Chip ID: 0x' + id.toString(16), (id === Tcs34725.CHIP_ID ? 'valid' : 'invalid'));
      prompt();
    })
    .catch(e => {
      console.log('error', e);
      prompt();
    });
  }

  else if(cmd.toLowerCase() === 'exit'){ rl.close(); }
  else { prompt(); }
}

Tcs34725.init().then(tcs => {
  commandHandler = (cmd) => _commandHandler(tcs, cmd);
  prompt();
});

