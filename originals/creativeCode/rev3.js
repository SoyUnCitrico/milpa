let w = 800;
let h = 1000;

let ns;
// let nsStep = 0.04;
let nsStep = 0.009;
let duration = 30000;

let verde1, verde2, verde3;
let vino1, vino2, vino3;
let frame = 0;
let startMillis;
let fps = 15;
let capturer = new CCapture({
  format: 'png',
  framerate: fps
});

function setup() {
    createCanvas(w, h);
    colorMode(HSB, 360, 100, 100, 100);   
    ellipseMode(CENTER) 
    rectMode(CORNERS)
    frameRate(fps);
    verde1 = color(88,22,100);
    verde2 = color(75,100,100);
    verde3 = color(80,88,80);
    
    vino1 = color(339,82,81);
    vino2 = color(332,78,64);
    vino3 = color(290,59,31);

    ns = random(100);
    // background(vino3);
    background(0);
    smooth();
}

function draw() {
    if (frame === 0) {

        // los objetos captures se usan para guardar el canvas 
        // durante cada frame de animación, activar en caso de 
        // querer guardar las imagenes. Los frames pueden unirse
        // rapidamente con 'ffmpeg' mediante terminal para formar
        // un video
        // capturer.start();
        
        startMillis = millis();
        frame ++;   
    }
    // let duration = 120000;
    let elapsed = millis() - startMillis;
    let t = map(elapsed, 0, duration, 0, 1);
    console.log(t);

    
    if(t <= 1) {
        sunset(t);
    } else if(t > 1 && t <= 1.03125) {
        
        ligtRay(t, w*.55, ns);
        ns += nsStep;
    } else if(t > 1.5 && t <= 2) {
        relieve(t, w*.3, w*.75, ns);
        ns += nsStep;
    } else if(t > 2) {
        noLoop();
        console.log('Finalizando');
        // capturer.stop();
        // capturer.save();
        return;

    }
       
    // capturer.capture(document.getElementById('defaultCanvas0'));

}

function relieve(tiempo, radioInt, radioExt, ruido) {
    push();
    translate(w/2, h*2/3);
    strokeWeight(1);

    let x = radioExt * cos(TWO_PI * tiempo);
    let y = radioExt * -sin(TWO_PI * tiempo);
    let a = radioInt * cos(TWO_PI * tiempo);
    let b = - radioInt * noise(ruido) * -sin(TWO_PI * tiempo); 
    console.log(b);
    let mt,br,st;
    mt = hue(vino2);
    br = brightness(vino2);
    br = br * noise(ruido);
    st = saturation(vino2);
    st = st * noise(ruido);
    vino2.setAlpha(noise(ruido) * 90 + 10);
    stroke(mt,br,st);
    line(a,b, x, y);
    pop();
}

function ligtRay(tiempo, radioExt, ruido){
    push();
    translate(w/2, h*2/3);
    strokeWeight(1);

    let x = radioExt * cos(PI * 64 * tiempo);
    let y = radioExt * -sin(PI * 64 * tiempo);

    vino2.setAlpha(noise(ruido) * 30 + 10);
    stroke(verde2);
    line(0,0, x, y);
    pop();
}
function sunset(tiempo) {
    push();
    translate(w/2,h*2/3);
    noFill();
    strokeWeight(1);
    // stroke(255,(255-255*log(tiempo)));
    verde1.setAlpha(40-pow(40,tiempo));
    noFill();
    stroke(verde1);
    ellipse(0,0,w*tiempo, w*tiempo);
    
    let alpha = tiempo * 1.72
    vino3.setAlpha(100*log(1 + alpha));
    stroke(vino3);
    strokeWeight(2);
    ellipse(0,0,w+h*tiempo*3/4,w+h*tiempo*3/4);

    translate(-w/2,0);
    noStroke();
    fill(0);
    rect(0,0,w,h/3);
    pop();
}

function keyTyped() {
    if (key === 's') {
        saveCanvas('rev', 'png');
    }
}

function cuadrados() {
    
}