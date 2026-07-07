let x, y , a, b;
let angle = 0;
let index = 0;
let indexVino = 0;
let angle2;
let stepAngle, stepAngle2;
let radio, radioChico;

let verde1, verde2, verde3;
let vino1, vino2, vino3;



function setup() {
    createCanvas(1000, 1000);
    colorMode(HSB, 360, 100, 100, 100);    
    
    verde1 = color(88,22,100);
    verde2 = color(75,100,100);
    verde3 = color(80,88,80);
    
    vino1 = color(339,82,81);
    vino2 = color(332,78,64);
    vino3 = color(290,59,31);
    background(vino3);
    // background(202,97,30);
    radioChico = width * .12;
    radio = width * .45
    // stepAngle = TWO_PI/5760;
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
    b = radioChico * noise(indexVino) * sin(angle);
    // stroke(noise(index)*255,noise(index)*255);
    // strokeWeight(noise(index));
    // point(x,y);
    // stroke(random(255));
    // stroke(118,(noise(index)*80 + 20), random(70,95), noise(index)*100);
    strokeWeight(1);
    if(angle2 <= PI) {
        
        vino2.setAlpha(noise(indexVino) * 30 + 10);
        stroke(vino2);
        line(a,b, x, y);
    }   else {
        verde1.setAlpha(noise(index) * 70 + 20);
        stroke(verde1);
        line(0,0, x, y);
    }
pop();

}

function actualiza() {
    index += 0.01;
    indexVino += 0.001;
    angle += stepAngle;
    angle2 -= stepAngle;
    }

    function keyTyped() {
        if (key === 's') {
            saveCanvas('rev', 'png');
        }
    }

function cuadrados() {
    let lado = width *.08;
    let str = 10;
    push();
    translate(width/2-1.5*lado, height/2);   
    console.log(lado);
    rotate(PI*1.75);
    for(let y = 0; y <= 40; y +=2) {
        // line(0, 0, lado, 0);
        stroke(verde2);
        strokeWeight(str);
        line(y*4, 0, y*4, lado*2);
        str-=0.5;
        // console.log(y);
    }
    pop();
}