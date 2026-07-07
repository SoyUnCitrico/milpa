let w = 1000;
let h = 1000;
let br = 0;
let st = 0;


let verde1, verde2, verde3;
let vino1, vino2, vino3;
let m,s,b;
let sStep, bStep;

var frame = 0;
var startMillis;
var fps = 30;
var capturer = new CCapture({
  format: 'png',
  framerate: fps
});

function setup() {
    createCanvas(w,h);
    background(0);
    frameRate(fps);
    colorMode(HSB,360,100,100,100);
    verde1 = color(88,22,100);
    verde2 = color(75,100,100);
    verde3 = color(80,88,80);
        
    vino1 = color(339,82,81);
    vino2 = color(332,78,64);
    vino3 = color(290,59,31);
    m = hue(vino3);
    b = brightness(vino3);
    s = saturation(vino3);
    bStep = b/162;
    sStep = s/162;
    background(0);
    
}


function draw() {
    if (frame === 0) {
        capturer.start();
        frame ++;   
    }

    
    // console.log("Holi");
    if (startMillis == null) {
        startMillis = millis();
    }
    
    var duration = 5390;
    var elapsed = millis() - startMillis;
    var t = map(elapsed, 0, duration, 0, 1);
    console.log(elapsed);
  
    if (t > 1) {
        noLoop();
        console.log('finished recording.');
        capturer.stop();
        capturer.save();
        return;
    } 

    if(br > b) br = b;
    if(st > s) st = s;
    background(m, st, br);
    // br ++;
    // st ++;
    br += bStep;
    st += sStep;


    // frame++;
    capturer.capture(document.getElementById('defaultCanvas0'));
}