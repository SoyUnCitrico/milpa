import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/revNoiz.js`.
 * Atardecer generativo en RGB (1080×1350, vertical estilo Instagram): degradado
 * de sol/cielo por círculos + rayos de luz en el horizonte; timeline por
 * `millis()` que termina con `noLoop()`. Se elimina el `CCapture`. Los `color()`
 * que en el original eran globales implícitos se declaran como clausura.
 */
export const revNoiz: SketchFactory = (p: p5) => {
  const w = 1080;
  const h = 1350;
  let t: number;
  let ns: number;
  const nsStep = 0.0075 / 2;
  const duration = 42190;
  let cuenta = 0;
  let ang = 0;
  let frame = 0;
  let startMillis: number;
  const fps = 30;

  let luz2: p5.Color, luz3: p5.Color;
  let dark2: p5.Color, dark3: p5.Color;
  let backColor: p5.Color;

  p.setup = () => {
    p.createCanvas(w, h);
    p.ellipseMode(p.CENTER);
    p.rectMode(p.CORNERS);
    p.frameRate(fps);

    p.colorMode(p.RGB, 255, 255, 255, 100);
    luz2 = p.color(247, 92, 1);
    luz3 = p.color(232, 20, 1);

    dark2 = p.color(96, 42, 105);
    dark3 = p.color(39, 15, 60);
    backColor = p.color(30, 3, 0);

    p.blendMode(p.BLEND);
    ns = p.random(100);
    p.background(backColor);
    p.smooth();
    t = 0;
  };

  p.draw = () => {
    if (frame === 0) {
      startMillis = p.millis();
      frame++;
    }

    const elapsed = p.millis() - startMillis;
    t = p.map(elapsed, 0, duration, 0, 1);

    if (t <= 1) {
      const nois = p.noise(ns);
      ns += nsStep;
      sunset(t, nois * 100);

      if (frame > 35) {
        const radio = p.map(t, 0, 1, 0, w / 2);
        const radio2 = p.map(t, 0, 1, w / 2, w);
        const brigth = p.map(t, 0, 1, 0, 120);

        if (cuenta == 0) {
          for (let i = 0; i < 9; i++) {
            const sep = i / 8;
            ligthRay(radio, sep, ang, brigth);
            ligthRay(radio2, sep, ang, brigth + 40);
          }
          cuenta++;
        }
        if (cuenta > 0) cuenta++;
        if (cuenta == 2) cuenta = 0;
        frame = 1;
      }
      ang = 15 * p.cos(t * p.TWO_PI * 1.5);
      frame++;
    } else if (t > 1) {
      p.noLoop();
      return;
    }
  };

  function ligthRay(radioExt: number, separacion: number, anguloInicio: number, brillo: number) {
    p.push();
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.translate(w / 2, (h * 2) / 3);
    p.strokeWeight(5);
    const x = radioExt * p.cos(p.PI * separacion) + anguloInicio;
    const y = radioExt * -p.sin(p.PI * separacion);

    const rayo = p.color(11, 47, 92);
    const hu = p.hue(rayo);
    const sat = p.saturation(rayo);
    const alfa = 100;
    p.stroke(hu, sat, brillo, alfa);
    p.point(x, y);
    p.pop();
  }

  function sunset(tiempo: number, alfa: number) {
    p.colorMode(p.RGB, 255, 255, 255, 100);
    p.push();
    p.translate(w / 2, (h * 2) / 3);
    p.noFill();
    p.strokeWeight(1);
    const sol = p.lerpColor(luz2, luz3, tiempo);
    const mult2 = 100 - 95 * p.pow(tiempo, 0.4);
    sol.setAlpha(mult2);

    p.noFill();
    p.stroke(sol);
    p.ellipse(0, 0, w * tiempo, w * tiempo);

    const cielo = p.lerpColor(dark2, dark3, alfa * 2);
    cielo.setAlpha(alfa);
    p.stroke(cielo);
    p.strokeWeight(1);
    p.ellipse(0, 0, w + (h * tiempo * 3) / 4, w + (h * tiempo * 3) / 4);

    p.translate(-w / 2, 0);
    p.noStroke();
    p.fill(9, 3, 30);
    p.rect(0, 1, w, h / 3);
    p.pop();
  }

  p.keyTyped = () => {
    if (p.key === "s") p.saveCanvas("rev", "png");
  };
};
