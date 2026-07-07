let x, y , a, b;
let angle = 0;
let index = 0;
let angle2;
let stepAngle, stepAngle2;
let radio, radioChico;


function setup() {
    createCanvas(500, 500);
    colorMode(HSB, 360, 100, 100, 100);    
    background(168,98,25);
    // background(202,97,30);
    radioChico = width * .12;
    radio = width * .45
    stepAngle = TWO_PI/360;
    angle2 = TWO_PI;
}

function draw() {

    

    // background(168,98,25);
    paisaje();
    actualiza();
    if(angle >=  TWO_PI) {
        cuadrados();
        noLoop();
        
    }
}

function paisaje() {
    push();
    translate(width/2, height/2);
    x = radio * cos(angle2);
    y = radio * sin(angle2);
    a = radioChico * cos(angle);
    b = radioChico * noise(index) * sin(angle);
    // stroke(noise(index)*255,noise(index)*255);
    // strokeWeight(noise(index));
    // point(x,y);
    // stroke(random(255));
    // stroke(118,(noise(index)*80 + 20), random(70,95), noise(index)*100);
    strokeWeight(1);
    if(angle2 <= PI) {
        
        stroke(173,80,94, noise(index) * 60);
        line(a,b, x, y);
    }   else {
        stroke(120,(noise(index)*10 + 10), random(90,95), noise(index)*80+10);
        line(0,0, x, y);
    }
pop();

}

function actualiza() {
    index += 0.0025;
    angle += stepAngle;
    angle2 -= stepAngle;
}

function keyTyped() {
    if (key === 's') {
        saveCanvas('rev', 'png');
    }
  }

function cuadrados() {
    let lado = width *.07;
    push();
    translate(width/2-lado/2, height/2-lado/2);
    let str = 10;
    
    
    for(let y = 0; y < 10; y ++) {
        // line(0, 0, lado, 0);
        stroke(255, );
        strokeWeight(str);
        line(0, y, lado, y*10);
        str -= 1;     
        console.log(y);
    }
    
    // rotate(PI/4);
    // for(let i = 0; i < 4; i++) {
    //     rotate(PI * i / 13);
    //     // VERDE OSCURO
    //     // fill(168,98,25,20);

        // fill(201,97,30,85);
        // rect(-lado / 2, -lado / 2, lado, lado);
    //     // rect(0,0, lado, lado);
        
    // }
    
    // VERDE
    // fill(117,69,83)
    // AZUL
    // fill(173,97,94);
    // ROJO
    // fill(0,97,94);
    // ellipse(0, 0, width*.01, width*.01);
    
    pop();
}