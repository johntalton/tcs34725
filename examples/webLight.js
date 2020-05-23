const { Tcs34725 } = require('../');

//Symbol.ondevicelight

class MockWindow {
  set ondevicelight(callback) {}
  addEventListener(eventName, callback) {}
}

class MockBody {
  get classList() { return { add: () => {}, remove: () => {} }; }
}

class Tcs23725Provider {
  
}


if(module.parent === null) {
  const window = new MockWindow();
  const body = new MockBody();

  setupTcs34725Provider();



const sensor = new AmbientLightSensor();
sensor.onreading = () => console.log(sensor.illuminance);
sensor.onerror = event => console.log(event.error.name, event.error.message);
sensor.start();



  // this code comes from the MDN example for the 
  // https://developer.mozilla.org/en-US/docs/Web/API/Ambient_Light_Events
  if ('ondevicelight' in window) {
    window.addEventListener('devicelight', function(event) {
      var body = document.querySelector('body');
      if (event.value < 50) {
        body.classList.add('darklight');
        body.classList.remove('brightlight');
      } else {
        body.classList.add('brightlight');
        body.classList.remove('darklight');
      }
    });
  } else {
    console.log('devicelight event not supported');
  }

}
