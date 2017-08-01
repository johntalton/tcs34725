'use stict';

var readline = require('readline');

const rasbus = require('rasbus');
const i2c = rasbus.i2c;
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
    tcs.setProfile({ powerOn: true }).then(() => {
      console.log('on');
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'off') {
    tcs.setProfile({ powerOn: false }).then(() => {
      console.log('off');
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'clear') {
    tcs.clearInterrupt().then(() => {
      console.log('cleared');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'active') {
    tcs.setProfile({ powerOn: true, active: true }).then(() => {
      console.log('enabled');
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'inactive') {
    tcs.setProfile({ powerOn: true, active: false }).then(() => {
      console.log('disabled');
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'wait') {
    tcs.setProfile({
      powerOn: true,
      active: true,
      integrationTimeMs: 24,
      wait: true,
      waitTimeMs: (2 * 1000),
      multiplyer: 4,
      filtering: 30,
      interrupts: true
    }).then(() => {
      console.log('wait');
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'nowait') {
    tcs.setProfile({ powerOn: true, active: true, wait: false }).then(() => {
      console.log('nowait');
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

i2c.init(1, 0x29).then(bus => {
  Tcs34725.init(bus).then(tcs => {
    const timer = startAutoLogout();
    commandHandler = (cmd) => _commandHandler(bus, tcs, timer, cmd);
    prompt();
  });
}).catch(e => {
  console.log('error', e);
});

