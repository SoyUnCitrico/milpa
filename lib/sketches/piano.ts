import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `Talleres2021-CC2/.../CC2/piano.js`.
 *
 * Piano de 10 teclas: un `p5.Oscillator` (square) con envolvente, reverb y delay
 * ping-pong. Clic en el canvas arranca/para el oscilador; las teclas
 * `a s d f g h j k l ñ` disparan las notas y pintan barras de color (HSB). Dos
 * sliders controlan el mix de delay y reverb.
 *
 * Usa `P5` (constructor) para instanciar los componentes de p5.sound. Se
 * eliminó el `.parent('sketch-container'/'sketch-info')` (el wrapper monta el
 * canvas; los sliders se posicionan sobre el lienzo) y se corrigió el bug
 * `osc.stop;` → `osc.stop()`.
 */
export const piano: SketchFactory = (p: p5, P5?: typeof p5) => {
  const Sound = P5 as unknown as {
    Envelope: new (...a: number[]) => any;
    Oscillator: new (tipo?: string) => any;
    Reverb: new () => any;
    Delay: new () => any;
  };

  const c = [0, 30, 60, 80, 160, 240, 270, 330, 40, 56];
  const keys = ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ñ"];
  const notes = [49, 51, 54, 56, 58, 61, 63, 66, 68, 70];

  let osc: any, env: any, reverb: any, delay: any;
  let delFeed: p5.Element, revbDecay: p5.Element;
  let isPlaying = false;
  let backColor: p5.Color;
  let x = 0;

  const toogleSystem = () => {
    if (isPlaying) {
      osc.stop();
      isPlaying = false;
    } else {
      osc.start();
      isPlaying = true;
    }
  };

  p.setup = () => {
    const cnv = p.createCanvas(500, 400);
    cnv.mousePressed(toogleSystem);

    delFeed = p.createSlider(0, 1, 0.5, 0.001);
    revbDecay = p.createSlider(0, 1, 0.5, 0.001);
    delFeed.position(8, 8);
    revbDecay.position(8, 32);

    p.colorMode(p.HSB);
    x = p.width / 10.5;

    env = new Sound.Envelope(0.01, 0.1, 0.5, 0.9);
    osc = new Sound.Oscillator("square");
    reverb = new Sound.Reverb();
    delay = new Sound.Delay();
    delay.setType("pingPong");
    backColor = p.color(179, 79, 53);
    env.setInput(osc);
    reverb.process(osc, 5, 2);
    delay.process(osc, 0.5, 0.75);
  };

  p.draw = () => {
    p.background(backColor);
    delay.drywet(delFeed.value() as number);
    reverb.drywet(revbDecay.value() as number);

    if (isPlaying) {
      p.noStroke();
      for (let i = 0; i < 10; i++) {
        p.fill(0, 0, 100);
        if (p.keyIsPressed) {
          if (p.key === keys[i]) {
            p.background(c[i], 50, 200);
            p.fill(c[i], 100, c[i] + 20);
            osc.freq(p.midiToFreq(notes[i]));
            env.play();
          }
        }
        p.rect(p.width / 32 + x * i, p.height / 4, (p.width / 10) * 0.75, p.height * 0.65);
      }
      p.push();
      p.fill(0, 0, 183);
      p.textAlign(p.CENTER);
      p.textSize(36);
      p.text("toca el piano", p.width / 2, 60);
      p.textSize(16);
      p.text("Delay: " + delFeed.value(), (p.width * 2) / 8, p.height - 16);
      p.text("Reverb: " + revbDecay.value(), (p.width * 6) / 8, p.height - 16);
      p.pop();
    } else {
      p.push();
      p.background(179, 79, 53);
      p.noStroke();
      p.fill(0, 0, 183);
      p.textAlign(p.CENTER);
      p.textSize(52);
      p.text("toca el canvas", p.width / 2, p.height / 2);
      p.pop();
    }
  };
};
