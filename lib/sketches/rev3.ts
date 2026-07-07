import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/rev3.js`.
 * Timeline por `millis()` (≈30 s): atardecer → rayo de luz → relieve, y termina
 * con `noLoop()`. Se elimina el `CCapture` original (export de video).
 */
export const rev3: SketchFactory = (p: p5) => {
  const w = 800;
  const h = 1000;

  let ns: number;
  const nsStep = 0.009;
  const duration = 30000;

  let verde1: p5.Color, verde2: p5.Color;
  let vino2: p5.Color, vino3: p5.Color;
  let frame = 0;
  let startMillis: number;
  const fps = 15;

  p.setup = () => {
    p.createCanvas(w, h);
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.ellipseMode(p.CENTER);
    p.rectMode(p.CORNERS);
    p.frameRate(fps);
    verde1 = p.color(88, 22, 100);
    verde2 = p.color(75, 100, 100);

    vino2 = p.color(332, 78, 64);
    vino3 = p.color(290, 59, 31);

    ns = p.random(100);
    p.background(0);
    p.smooth();
  };

  p.draw = () => {
    if (frame === 0) {
      startMillis = p.millis();
      frame++;
    }
    const elapsed = p.millis() - startMillis;
    const t = p.map(elapsed, 0, duration, 0, 1);

    if (t <= 1) {
      sunset(t);
    } else if (t > 1 && t <= 1.03125) {
      ligtRay(t, w * 0.55, ns);
      ns += nsStep;
    } else if (t > 1.5 && t <= 2) {
      relieve(t, w * 0.3, w * 0.75, ns);
      ns += nsStep;
    } else if (t > 2) {
      p.noLoop();
      return;
    }
  };

  function relieve(tiempo: number, radioInt: number, radioExt: number, ruido: number) {
    p.push();
    p.translate(w / 2, (h * 2) / 3);
    p.strokeWeight(1);

    const x = radioExt * p.cos(p.TWO_PI * tiempo);
    const y = radioExt * -p.sin(p.TWO_PI * tiempo);
    const a = radioInt * p.cos(p.TWO_PI * tiempo);
    const b = -radioInt * p.noise(ruido) * -p.sin(p.TWO_PI * tiempo);
    let mt: number, br: number, st: number;
    mt = p.hue(vino2);
    br = p.brightness(vino2);
    br = br * p.noise(ruido);
    st = p.saturation(vino2);
    st = st * p.noise(ruido);
    vino2.setAlpha(p.noise(ruido) * 90 + 10);
    p.stroke(mt, br, st);
    p.line(a, b, x, y);
    p.pop();
  }

  function ligtRay(tiempo: number, radioExt: number, ruido: number) {
    p.push();
    p.translate(w / 2, (h * 2) / 3);
    p.strokeWeight(1);

    const x = radioExt * p.cos(p.PI * 64 * tiempo);
    const y = radioExt * -p.sin(p.PI * 64 * tiempo);

    vino2.setAlpha(p.noise(ruido) * 30 + 10);
    p.stroke(verde2);
    p.line(0, 0, x, y);
    p.pop();
  }

  function sunset(tiempo: number) {
    p.push();
    p.translate(w / 2, (h * 2) / 3);
    p.noFill();
    p.strokeWeight(1);
    verde1.setAlpha(40 - p.pow(40, tiempo));
    p.noFill();
    p.stroke(verde1);
    p.ellipse(0, 0, w * tiempo, w * tiempo);

    const alpha = tiempo * 1.72;
    vino3.setAlpha(100 * p.log(1 + alpha));
    p.stroke(vino3);
    p.strokeWeight(2);
    p.ellipse(0, 0, w + (h * tiempo * 3) / 4, w + (h * tiempo * 3) / 4);

    p.translate(-w / 2, 0);
    p.noStroke();
    p.fill(0);
    p.rect(0, 0, w, h / 3);
    p.pop();
  }

  p.keyTyped = () => {
    if (p.key === "s") p.saveCanvas("rev", "png");
  };
};
