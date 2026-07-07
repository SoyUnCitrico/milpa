// Circulos en proporciones aureas

let diametroBase = 81;
let diametroDos = diametroBase * 1.618;
let diametroTres = diametroDos * 1.618;
let diametroCuatro = diametroTres * 1.618;
let diametroCinco = diametroCuatro * 1.618;
let diametroSeis = diametroCinco * 1.618;

// Vectores de posicion
let centro; 
let esquinaSI, esquinaSD, esquinaII, esquinaID;
let retSI, retSD, retII, retID;
let angle =  0;

function setup() {
  createCanvas(1000,1000);
  centro = createVector(width/2, height/2);

  esquinaSI = createVector(50, 50);
  esquinaSD = createVector(950, 50);
  esquinaII = createVector(50, 950);
  esquinaID = createVector(950, 950);

  retSI = createVector(350, 350);
  retSD = createVector(650, 350);
  retII = createVector(350, 650);
  retID = createVector(650, 650);

  rectMode(CENTER)
}

function draw() {
  background(200);
  



  noStroke();
  // dibujarCirculos();
  circulosSeis();
  cuadro();
  circulosCinco();
  circulosTres();
  circulosCuatro();
  circulosDos();
  circulosUno(angle);

  
  // reticulas();

  angle += 0.01;
  angle %= TWO_PI;
  console.log(angle);

}

function cuadro(angulo) {
  push();
  translate(centro.x, centro.y);
  rotate(angle);
  noFill();
  strokeWeight(5)
  stroke(0,255);
  rect(0, 0, width*3/10, height*3/10);
  pop();
}

function reticulas() {
  push();
  stroke(0);
  rect(centro.x,centro.y,900,900);
  line(350,50,350,950);
  line(650,50,650,950);
  line(50,350,950,350);
  line(50,650,950,650);
  pop();

  // // Solo para identificar los puntos de interes
  // push();
  // strokeWeight(5);
  // point(esquinaSI);
  // point(esquinaSD);
  // point(esquinaII);
  // point(esquinaID);
  // point(retSI);
  // point(retSD);
  // point(retII);
  // point(retID);
  // pop();
}

function dibujarCirculos() {
  ellipse(centro.x, centro.y, diametroBase, diametroBase);
  ellipse(centro.x, centro.y, diametroDos, diametroDos);
  ellipse(centro.x, centro.y, diametroTres, diametroTres);
  ellipse(centro.x, centro.y, diametroCuatro, diametroCuatro);
  ellipse(centro.x, centro.y, diametroCinco, diametroCinco);
  ellipse(centro.x, centro.y, diametroSeis, diametroSeis);
}

function circulosUno(angulo) {
  push();
  fill(139,19,0,255*.8);

  translate(esquinaSI.x, esquinaSI.y);
  // rotate(angle);

  // gira(centro,esquinaSI.rotate(angulo));
  ellipse(0 + diametroBase/2, 0 + diametroBase/2, diametroBase, diametroBase);

  // translate(esquinaSD.x, esquinaSD.y);
  // ellipse(0 - diametroBase/2, 0 + diametroBase/2, diametroBase, diametroBase);
  // ellipse(0 + diametroBase/2, 0 - diametroBase/2, diametroBase, diametroBase);
  // ellipse(0 - diametroBase/2, 0 - diametroBase/2, diametroBase, diametroBase);
  // ellipse(centro.x, centro.y, diametroBase, diametroBase);  
  pop();
}

function circulosDos() {
  push();
  fill(242,222,208,255*.5);
  ellipse(retSI.x - diametroDos/2, retSI.y - diametroDos/2, diametroDos, diametroDos);
  ellipse(retSD.x + diametroDos/2, retSD.y - diametroDos/2, diametroDos, diametroDos);
  ellipse(retII.x - diametroDos/2, retII.y + diametroDos/2, diametroDos, diametroDos);
  ellipse(retID.x + diametroDos/2, retID.y + diametroDos/2, diametroDos, diametroDos);
  pop();
}

function circulosTres() {
  push();
  fill(199,208,157,255*.5);
  ellipse(centro.x, centro.y, diametroTres, diametroTres);
  pop();
}

function circulosCuatro() {
  push();
  fill(241,158,96,255*.5);
  ellipse(esquinaSI.x + diametroCuatro/2, esquinaSI.y + diametroCuatro/2, diametroCuatro, diametroCuatro);
  ellipse(esquinaSD.x - diametroCuatro/2, esquinaSD.y + diametroCuatro/2, diametroCuatro, diametroCuatro);
  ellipse(esquinaII.x + diametroCuatro/2, esquinaII.y - diametroCuatro/2, diametroCuatro, diametroCuatro);
  ellipse(esquinaID.x - diametroCuatro/2, esquinaID.y - diametroCuatro/2, diametroCuatro, diametroCuatro);
  pop();
}

function circulosCinco() {
  push();
  fill(36,32,226,255*.5);
  ellipse(esquinaSI.x + diametroCinco/2, esquinaSI.y + diametroCinco/2, diametroCinco, diametroCinco);
  ellipse(esquinaID.x - diametroCinco/2, esquinaID.y - diametroCinco/2, diametroCinco, diametroCinco);
  fill(229,53,35,255*.5);
  ellipse(esquinaSD.x - diametroCinco/2, esquinaSD.y + diametroCinco/2, diametroCinco, diametroCinco);
  ellipse(esquinaII.x + diametroCinco/2, esquinaII.y - diametroCinco/2, diametroCinco, diametroCinco);
  pop();
}

function circulosSeis() {
  push();
  fill(30,152,103,255*.64);
  ellipse(centro.x, centro.y, diametroSeis, diametroSeis);
  pop();
}

function gira(base, vec) {

  translate(base.x, base.y);
  stroke(0);
  strokeWeight(5);
  line(0, 0, vec.x, vec.y);
  rotate(vec.heading());
}