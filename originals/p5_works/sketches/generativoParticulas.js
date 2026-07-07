// https://thecodingtrain.com/CodingChallenges/024-perlinnoiseflowfield.html

var inc = 0.1;
var scl = 10;
var cols, rows;

var zoff = 0;

var fr;

var particles = [];

var flowfield;

function setup() {
  createCanvas(600, 600);
  cols = floor(width / scl);
  rows = floor(height / scl);
  fr = createP('');

  flowfield = new Array(cols * rows);

  for (var i = 0; i < 300; i++) {
    particles[i] = new Particle();
  }
  background(255);
}

function draw() {
  //background(255);
  var yoff = 0;

  //actualiza la posicion del campo
  for (var y = 0; y < rows; y++) {
    var xoff = 0;
    for (var x = 0; x < cols; x++) {
      var index = x + y * cols;
      var angle = noise(xoff, yoff, zoff) * TWO_PI * 4;
      var v = p5.Vector.fromAngle(angle);
      v.setMag(1);
      flowfield[index] = v;
      xoff += inc;
      //stroke(0, 50);
      //push();
      //translate(x * scl, y * scl);
      //rotate(v.heading());
      //strokeWeight(1);
      //line(0, 0, scl, 0);
      //pop();
    }
    yoff += inc;

    zoff += 0.0001;
  }

  for (var i = 0; i < particles.length; i++) {
    particles[i].follow(flowfield);
    particles[i].update();
    particles[i].edges();
    particles[i].show();
    particles[i].updateRgb();
    
  if (particles[i].finished()) {
        particles.splice(i, 0);
      }
  }
  // fr.html(floor(frameRate()));
}







class Particle {
    constructor() {
      this.pos = createVector(random(250, 350), random(250, 350));
      this.vel = createVector(0, 0);
      this.acc = createVector(0, 0);
      this.maxspeed = 4;
      this.prevPos = this.pos.copy();
      this.r = 0;
      this.g = 0;
      this.b = 255;
      this.alpha = 255;
      this.stroke = random(1, 5);
    }
  
    finished() {
      return this.alpha < 0;
    }
  
    update() {
      this.vel.add(this.acc);
      this.vel.limit(this.maxspeed);
      this.pos.add(this.vel);
      this.acc.mult(0);
      this.alpha -= 0.08;
      this.r += 0.1;
      this.g += 0.1;
      this.b -= 0.1;
    }
  
    follow(vectors) {
      var x = floor(this.pos.x / scl);
      var y = floor(this.pos.y / scl);
      var index = x + y * cols;
      var force = vectors[index];
      this.applyForce(force);
    }
  
    applyForce(force) {
      this.acc.add(force);
    }
  
    show() {
      stroke(this.r, this.g, this.b, this.alpha);
      strokeWeight(this.stroke);
      line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);
      this.updatePrev();
    }
  
    updateRgb() {
      if (this.r > 10) {
        this.r -= random(0.1, 0.2);
      }
      if (this.r == 0) {
        this.r += random(0.1, 0.2);
      }
  
      if (this.g > 10) {
        this.g -= random(0.1, 0.2);
      }
      if (this.g == 0) {
        this.g += random(0.1, 0.2);
      }
  
      if (this.b == 0) {
        this.b += random(0.1, 0.3);
      }
      if (this.b == 255) {
        this.b -= random(0.1, 0.3);
      }
    }
  
  
  
    updatePrev() {
      this.prevPos.x = this.pos.x;
      this.prevPos.y = this.pos.y;
    }
  
    edges() {
      if (this.pos.x > width || this.pos.x < 0) {
        this.vel.x = (-1) * this.vel.x;
      }
      if (this.pos.y > height || this.pos.y < 0) {
        this.vel.y = (-1) * this.vel.y;
      }
    }
  
}