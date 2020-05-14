const Convert = require('color-convert');


const PRE16 = '\x1b[';
const POST16 = 'm';
const RESET = '\x1b[0m';

const PRE256 = '\u001b[48;5;'
const POST256 = 'm';

const step = 50;

for(r = 0; r < 255; r += step) {
  for(g = 0; g < 255; g += step) {
    for(b = 0; b < 255; b += step) {
      //const c16 = Convert.rgb.ansi16([r, g, b]);
      //console.log(PRE16 + c16 + POST16 + [r,g,b] + RESET)
      

      const c256 = Convert.rgb.ansi256([r, g, b]);
      console.log(PRE256 + c256 + POST256 + [r,g,b] + RESET)
      
      //console.log();
    }
  }
}
