'use stict';

var readline = require('readline');

const rasbus = require('rasbus');
const Tcs34725 = require('./tcs34725.js'); 

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let commandHandler;

function prompt() {
  lastPromptTime = Date.now();
  rl.question('tcs34725@i2c> ', commandHandler);
}

function _commandHandler(bus, tcs, timer, cmd) {
  if(cmd.toLowerCase() === 'id'){
    tcs.id().then(id => {
      console.log('Chip ID: 0x' + id.toString(16));
      prompt();
    })
    .catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'on') {
    tcs.powerOn().then(() => {
      console.log('on');
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'profile') {
    tcs.profile().then(profile => {
      console.log(profile);
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }

  else if(cmd.toLowerCase() === 'exit'){ clearInterval(timer); rl.close(); }
  else { prompt(); }
}

function startAutoLogout() {
  const autoLogoutTimeoutMs = 1000 * 60 * 1;

  // stuffed in variable so callback has scope
  const timer = setInterval(() => {
    if(lastPromptTime === undefined){
      // i came first
      lastPromptTime = Date.now();
      return;
    }

    if(Date.now() - lastPromptTime > autoLogoutTimeoutMs) {
      console.log(' --- auto logout ---');
      clearInterval(timer);
      rl.close();
    }
  }, 1000 * 15);

  return timer;
}

rasbus.i2cbus.init(1, 0x29).then(bus => {
  Tcs34725.init(bus).then(tcs => {
    const timer = startAutoLogout();
    commandHandler = (cmd) => _commandHandler(bus, tcs, timer, cmd);
    prompt();
  });
}).catch(e => {
  console.log('error', e);
});

