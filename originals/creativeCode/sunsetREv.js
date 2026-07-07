let w = 1080;
let h = 1350;
let t;
let ns;
// let nsStep = 0.014;
let nsStep = 0.0075/2;
// let duration = 42190;
let duration = 42190;
let ang = 0;
let frame = 0;
let startMillis;
let fps = 30;
let capturer = new CCapture({
  format: 'png',
  framerate: fps
});

function setup() {
    createCanvas(w, h);
      
    ellipseMode(CENTER) 
    rectMode(CORNERS)
    frameRate(fps);

    // ligthPink
    colorMode(RGB, 255,255,255,100); 
    luz1 = color(246,151,123,25);
    luz2 = color(247,92,1);
    luz3 = color(232,20,1);
    
    dark1 = color(194,104,147);
    dark2 = color(96,42,105);
    dark3 = color(39,15,60);
    backColor = color(30,3,0);

    blendMode(BLEND);
    ns = random(100);
    background(0,0);
    // background(backColor);
    smooth();
    t = 0;
}

function draw() {
    if (frame === 0) {
        capturer.start();
        startMillis = millis();
        frame ++;   
    }
    let elapsed = millis() - startMillis;
    t = map(elapsed, 0, duration, 0, 1);
    // console.log(t);

    if(t <= 1) {

        let t3 = map(t, 0, 1, 0.5, 1);
        relieve(t3, w*.2, w*.8, ns);
        ns += nsStep;

    } else if(t > 1
        ) {
        noLoop();
        console.log('Finalizando');
        capturer.stop();
        capturer.save();
        return;
    }
    capturer.capture(document.getElementById('defaultCanvas0'));
}

function relieve(tiempo, radioInt, radioExt, ruido) {
    push();
    translate(w/2, h*2/3);
    strokeWeight(1);

    let x = radioExt * cos(TWO_PI * tiempo);
    let y = radioExt * -sin(TWO_PI * tiempo);
    let a = radioInt * cos(TWO_PI * tiempo);
    let b = - radioInt * noise(ruido) * -sin(TWO_PI * tiempo); 
    // console.log(b);

    // HSB
    // let mt,br,st;
    // mt = hue(dark3);
    // br = brightness(dark3);
    // br = br * noise(ruido);
    // st = saturation(dark3);
    // st = st * noise(ruido);
    // stroke(mt,br,st);

    // RGB
    let relieve = color(21,35,64);
    relieve.setAlpha(noise(ruido) * 60 + 40);
    stroke(relieve);
    
    line(a,b, x, y);
    pop();
}

function ligtRay(radioExt, separacion,anguloInicio,brillo,ruido){
    
    push();
    colorMode(HSB,360,100,100,100);
    translate(w/2, h*2/3);
    strokeWeight(5);
    let x = radioExt * cos(PI*(separacion)) + anguloInicio;
    let y = radioExt * -sin(PI*(separacion));

    let rayo = color(11,47,92);
    let hu = hue(rayo);
    let sat = saturation(rayo);
    // let alfa = map(brillo,0,255,100,0);
    let alfa = 100;
    stroke(hu,sat,brillo,alfa);
    // stroke(0);
    point(x, y);
    console.log(y);
    pop();
}
function sunset(tiempo, alfa) {
    colorMode(RGB,255,255,255,100);
    push();
    translate(w/2,h*2/3);
    noFill();
    strokeWeight(1);
    // stroke(255,(255-255*log(tiempo)));
    // let mult2 = 100-exp(4.62*tiempo);
    // let mult2 = 100 * pow(tiempo,2)
    // let sol = lerpColor(luz3,luz2,tiempo);   //HSB
    let sol = lerpColor(luz2,luz3,tiempo);      //RGB
    // let sol = lerpColor(luz2,luz3,alfa);      //RGB
    let mult2 = 100 - (95 * pow(tiempo,0.4))  
    // console.log(mult2);                      
    sol.setAlpha(mult2);
    // sol.setAlpha(alfa);

    noFill();
    stroke(sol);
    ellipse(0,0,w*tiempo, w*tiempo);
    
    // Regla de tres 
    // 138.62 == 100
    // 100 == ???
    // let mult = 72.14*log(1 + alpha);
    // let mult =  5*exp(3.05*tiempo)-5;
    // let cielo = lerpColor(dark2, dark1, tiempo) //HSB
    // let cielo = lerpColor(dark2, dark3, tiempo*1.5) //RGB
    let cielo = lerpColor(dark2, dark3, alfa*2) //RGB
    // let mult = 95 * pow(tiempo,1.5) + 7

    cielo.setAlpha(alfa);
    stroke(cielo);
    strokeWeight(1);
    ellipse(0,0,w+h*tiempo*3/4,w+h*tiempo*3/4);

    translate(-w/2,0);
    noStroke(); 
    fill(9,3,30);
    rect(0,1,w,h/3);
    pop();
}

function keyTyped() {
    if (key === 's') {
        saveCanvas('rev', 'png');
    }
}
 