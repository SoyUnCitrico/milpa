let ciclos = 6; // number
const numParticulas = 200; // number
const particleSize = 5; // number
const particleStroke = 2; // number

let radioInterior = 10;
let radioExterior = 150;
let radioSteps =  radioExterior * 0.95;
const particleType = 'circle' //'line | 'line' | 'square'

let playing = false;
let living = false;
let showField = false;
let ang = 0;
let ang2 = 0;
let ang3 = 0;

let dirAng = 1;
let dirAng2 = -2;
let dirRadio = 1;
let dirRadio2 = 2;

let cics = 1;
let dirCics = 0.0075;

let rueda, ruedita, ruedota;
let t = 0;
let capturer;

let colorS = '#f2542d6f';
let color1 = '#127475';
let color2 = '#F5DFBB';
let color3 = '#0E9594';
let colorFondo = 'rgba(28, 14, 14, 1)';

function setup() {
  frameRate(30)
  createCanvas(600, 600).parent('mainContainer');
  background(colorFondo);
  // rectMode(CENTER);   

  ruedita = new Spiral(numParticulas * 2, ciclos * 2,2,radioExterior/4, radioSteps, particleSize / 1, 1, particleType, color1, colorS);

  rueda = new Spiral(numParticulas, ciclos,radioInterior*10,radioExterior, radioSteps, particleSize, 0, particleType, color2, colorS);

  ruedota = new Spiral(numParticulas*1.25, ciclos, radioInterior*17,radioExterior*1.75, radioSteps, particleSize*3, 0, 'square', color3, colorS);
  smooth();

}

function draw() {
  
  background(28, 14, 14,28);

  rueda.update();
  ruedita.update();
  ruedota.update();

  ruedota.draw();
  rueda.draw();
  ruedita.draw();
  
  let offsetAngle2 = (ang) * -1;
  ruedita.setOffsetAngle(ang2)
  rueda.setOffsetAngle(ang);
  ruedota.setOffsetAngle(offsetAngle2);

  ruedita.setRadioInt(radioInterior);
  rueda.setCicles(cics);
  ruedota.setRadioExt(radioExterior);
  ruedota.setRadioInt(radioInterior);

  ang += dirAng;
  ang2 += dirAng2;

  cics += dirCics;

  if(cics >= 3.5 || radioInterior <= 0.15) {
    dirCics *= -1;
  }

  radioExterior += dirRadio2;
  radioInterior += dirRadio;

  if(radioInterior >= width/4.2 || radioInterior <= 0) {
    dirRadio *= -1;
  }

  if(radioExterior >= width/2 || radioExterior <= width/4) {
    dirRadio2 *= -1;
  }
}



function keyPressed() {
  if (key === 'p') {
    // saveFrames('frame_', 'png', 10, 30);
  }

  if (key === 's') {
    // saveFrames('frame_', 'png', 10, 30);
  }
}

