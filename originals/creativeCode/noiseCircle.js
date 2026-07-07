let x = 0;
let y = 0;
let angle = 0;
let radio = 430;
let sw = 5;
let sC = 0;
let index = 0;

function setup() {
    createCanvas(1000, 1000);
    background(0);

    push();
    translate(width/2, height/2);
    stroke(255);
    strokeWeight(5);
    point(0,0);
    pop();

}

function draw() {

    push();
        translate(width/2, height/2);
        x = radio * cos(angle);
        y = radio * sin(angle);
        stroke(200, noise(index*4)*255);
        strokeWeight(noise(index)*5);
        point(x,y);
        // stroke(random(255));
        stroke(noise(index)*255,noise(index*3)*255);
        strokeWeight(1);
        line(0,0, x, y)
    pop();

    angle += 0.005;
    angle %= TWO_PI;

    index += 0.007;


    // sw -= 0.02;
    console.log(sC);
}