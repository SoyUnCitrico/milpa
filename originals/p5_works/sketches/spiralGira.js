let ciclos =24.45; // number
const numParticulas = 400; // number
const particleSize = 3; // number
const particleStroke = 0; // number

let radioInterior = 0;
let radioExterior = 100;
let radioSteps =  numParticulas;
const particleType = 'circle' //'line | 'line' | 'square'

let playing = false;
let living = false;
let showField = false;
let ang = 0;
let ang2 = 0;
let ang3 = 0;

let dirAng = 0.5;
let dirAng2 = dirAng * -3;
let dirAng3 = dirAng * 0.275;
let dirRadio = 1;
let dirRadio2 = 5;
let dirRadio3 = 1;

let cics = ciclos/2.985;
let dirCics = - cics / 2000;
let cicsPetalos = 1;
let dirCicsPet = 0.01;

let flor = [];
const florCapas = 4;

let t = 0;
let capturer;

let colorS = '#E7A014';
let color1 = '#824B27';
let color2 = '#0e060fff';
let color3 = '#C86D18';
let colorFondo = 'rgba(146, 182, 228, 1)';

let centro, corona, semillas, petalos;

function setup() {
  frameRate(30)
  createCanvas(1080, 1080).parent('mainContainer');
  background(colorFondo);
  // rectMode(CENTER);   

  centro = new Spiral(numParticulas, ciclos, radioInterior, radioExterior, radioSteps, particleSize, particleStroke, 'square', color1);

  corona = new Spiral(numParticulas/2, ciclos/2.985,radioExterior, radioExterior * 2, radioSteps, particleSize * 2.4, 0, particleType, color2, colorS);

  semillas = new Spiral(numParticulas, ciclos/1.185, radioExterior * 1.46,radioExterior * 2.5, radioSteps, particleSize * 2, 0, 'circle', color3, colorS);

  petalos = new Spiral(35, cicsPetalos, radioExterior * 4, radioExterior * 4 , 35, particleSize * 10, 2, 'square', colorS, '#0e060f33');

  smooth();

}

function draw() {
  
  background(146, 182, 228, 10);

  corona.update();
  centro.update();
  semillas.update();
  petalos.update();

  semillas.draw();
  corona.draw();
  centro.draw();
  petalos.draw();
  
  let offsetAngle2 = (ang) * -1;
  petalos.setOffsetAngle(ang3)
  centro.setOffsetAngle(ang2)
  corona.setOffsetAngle(ang);
  semillas.setOffsetAngle(offsetAngle2);

  centro.setRadioInt(centro.getRadioInterior() + dirRadio);
  corona.setCicles(cics);
  semillas.setRadioExt(semillas.getRadioExterior() + dirRadio2);
  semillas.setRadioInt(semillas.getRadioInterior() + dirRadio3);
  petalos.setCicles(cicsPetalos);

  ang += dirAng;
  ang2 += dirAng2;
  ang3 += dirAng3;

  cics += dirCics;
  cicsPetalos += dirCicsPet;

  if(cics >= ciclos/2.985 || cics <= 7.8) {
    dirCics *= -1;
  }

  if(centro.getRadioInterior() >= radioExterior || centro.getRadioInterior() <= 0) {
    dirRadio *= -1;
  }

  if(semillas.getRadioExterior() >= width/2.75 || semillas.getRadioExterior() <= radioExterior * 1.3) {
    dirRadio2 *= -1;
  }

  if(semillas.getRadioInterior() >= radioExterior * 1.5 || semillas.getRadioInterior() <= -10) {
    dirRadio3 *= -1;
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

