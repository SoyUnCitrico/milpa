const sfColor1 = '#824B27'
const sfColor2 = '#0E060F'
const sfColor3 = '#C86D18'
const sfColor4 = '#E7A014'
const skyColor = '#92B6E4'

const numParticulas_1 = 400;
const numParticulas_2 = 100;
const numParticulas_3 = 800;
const numParticulas_4 = 25;

let playing = false;
let living = false;

let sf_centro1 = [];
let sf_centro2 = [];
let sf_centro3 = [];
let sf_petalos = [];

function setup() {
    createCanvas(1254, 1254).parent('mainContainer');
    background(skyColor);
    // push();
    // noStroke();
    // fill(sfColor2);
    // ellipse(width/2, height/2, 1254, 1254);

    // fill(sfColor3);
    // ellipse(width/2, height/2, 532, 532);

    // fill(sfColor2);
    // ellipse(width/2, height/2, 368, 352);

    // fill(sfColor1);
    // ellipse(width/2, height/2, 252, 228);
    // pop();

    sf_centro1 = [...setSpiral(9.01, 0, 252, 252*3.1, numParticulas_1, 4, 0, 'square', sfColor1)];
    sf_centro2 = [...setSpiral(3.115, 125, 364, (368-252) * 4.2, numParticulas_2, 10, 1, 'circle', sfColor2)];
    sf_centro3 = [...setSpiral(32.3, 170, 700, (532) * 8, numParticulas_3, 4 , 2 , 'circle', sfColor3)];
    sf_petalos = [...setSpiral(1, 400, 400, 2, numParticulas_4, 20 , 0, 'square', sfColor4)];
    

}

function draw() {
  for (var i = 0; i < sf_centro1.length; i++) {    
    //sf_centro1[i].follow(newDirections[i]); 
    // if(playing) {
    //   sf_centro1[i].update();
    // }
    // if(living) {
    //   sf_centro1[i].updateRgb();
    //   if (sf_centro1[i].finished()) {
    //     sf_centro1.splice(i, 0);
    //   }
    // }
    // sf_centro1[i].edges();
    sf_centro1[i].show(sf_centro1[i].type);
    
  }

  for (var i = 0; i < sf_centro2.length; i++) {    
    //sf_centro1[i].follow(newDirections[i]); 
    // if(playing) {
    //   sf_centro2[i].update();
    // }
    // if(living) {
    //   sf_centro2[i].updateRgb();

    //   if (sf_centro2[i].finished()) {
    //     sf_centro2.splice(i, 0);
    //   }
    // }
    // sf_centro2[i].edges();
    sf_centro2[i].show(sf_centro2[i].type);
  }

  for (var i = 0; i < sf_centro3.length; i++) {    
    //sf_centro3[i].follow(newDirections[i]); 
    // if(playing) {
    //   sf_centro3[i].update();
    // }
    // if(living) {
    //   sf_centro3[i].updateRgb();

    //   if (sf_centro3[i].finished()) {
    //     sf_centro3.splice(i, 0);
    //   }
    // }
    // sf_centro3[i].edges();
    sf_centro3[i].show(sf_centro3[i].type);
  }

  for (var i = 0; i < sf_petalos.length; i++) {    
    //sf_petalos[i].follow(newDirections[i]); 
    // if(playing) {
    //   sf_petalos[i].update();
    // }
    // if(living) {
    //   sf_petalos[i].updateRgb();

    //   if (sf_petalos[i].finished()) {
    //     sf_petalos.splice(i, 0);
    //   }
    // }
    // sf_petalos[i].edges();
    sf_petalos[i].show(sf_petalos[i].type);
  }
  //updateSpiral()
}

function setSpiral(ciclos = 1, radioInt = 10, radioExt = 100, stepsRadio = 200, totalParticles = 100, particleSize = 5, particleStroke = 2, particleType = 'circle', particleColor = '#000000') {
  const spiral = [];
  for(var i = 0; i < totalParticles; i++) {
      let angleIncrement = 360 / totalParticles * ciclos;
      let angle = TWO_PI / 360 * (angleIncrement * i);
      let actualRadio = ((radioExt - radioInt) * i / stepsRadio) + radioInt;
      let xPos = actualRadio * sin(angle) + width / 2;
      let yPos = actualRadio * cos(angle) + height / 2; 
      const newPos = createVector(xPos, yPos);
      const newParticle = new Particle(newPos, particleSize, particleStroke, particleType, particleColor, angle);
      spiral.push(newParticle);
  }
  return spiral;
}

function updateSpiral(spiralArray, ciclos = 1, radioInt = 10, radioExt = 100, stepsRadio = 200) {
  for(var i = 0; i < spiralArray.length; i++){
    let angleIncrement = 360 / spiralArray.length * ciclos;
    let angle = TWO_PI / 360 * (angleIncrement * i);
    let actualRadio = ((radioExt - radioInt) * i / stepsRadio) + radioInt;
    let xPos = actualRadio * sin(angle) + width / 2;
    let yPos = actualRadio * cos(angle) + height / 2; 

    const newPos = createVector(xPos, yPos);
    spiralArray[i].setPosition(newPos);

  }
}