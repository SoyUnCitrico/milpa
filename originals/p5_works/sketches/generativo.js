var x = 0;
var y = 0;
var gap = 20;
var deg = 0;
var colorFondo = '#362C28';
var color1 = '#F3C969';
var color2 = color1;
var color3 = '#D4FCC3';
var color4 = '#EDFF86';

function setup() {
	createCanvas(600,600);
	background(colorFondo);
	frameRate(60);
}

function mousePressed() { //If you click the mouse, the lines and shapes will turn cyan.
	color2 = color3; 
}

function mouseReleased() { //If you release the mouse click, the lines and shapes will turn red.
	color2 = color1;
}

function draw() {
	spin();
	maze();
	grid();
}

function maze() { // Crea un patron random de lineas
	stroke(color2);
	strokeWeight(2);
	if (random(2) < 0.5) { // The if statement changes the direction of the lines.
	line(x, y, x + gap, y + gap);
	} else {
	line(x, y + gap, x + gap, y);
	}
	
	x = x+ 10; //This allows the lines to go across the canvas.
	if (x > width) {
	x = 0;
	y = y + gap;
	}
	
}

function grid() { // Crea una cuadricula de ellipses
	
	for ( var i = 0; i < windowWidth; i += 45 ) {
		for ( var j = 0; j < windowHeight; j += 45 ) {
			noStroke();
			fill(color4);
			rotate(PI);
			ellipse(i, j, 20, 10,);		
		}
	}
}
					
function spin() { //Crea un circulo a la mitad del canvas
	push();
	scale(1);
	translate(width/2,height/2);
	rotate(radians(deg));
	deg++;
	fill(color2);
	rect(0,0,100,100);
	pop();
	
}
function keyPressed() { //Guarda el canvas como PNG
	if (key == 'f') {
  	saveCanvas('','png');
	}
}