import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/trayectorias.js`.
 * Tres trayectorias paramétricas (logarítmica, senoidal y de Lissajous) trazadas
 * sobre el tiempo con opacidad modulada por ruido; termina con `noLoop()`. Se
 * elimina el `CCapture`; `back` (global implícito) pasa a clausura.
 */
export const trayectorias: SketchFactory = (p: p5) => {
  const w = 1000;
  const h = 1000;

  let col1: p5.Color, col2: p5.Color, col3: p5.Color, back: p5.Color;

  let ns = 0;
  const nsStep = 0.01;
  const duration = 60000;

  let frame = 0;
  let startMillis: number;
  const fps = 15;

  p.setup = () => {
    p.createCanvas(w, h);
    p.frameRate(fps);
    p.ellipseMode(p.CORNER);
    p.rectMode(p.CORNERS);
    col1 = p.color(0, 0, 255); // LÍNEAS
    col2 = p.color(255, 0, 0); // LOG
    col3 = p.color(0, 255, 0); // SIN
    back = p.color(0);

    p.background(back);
    ns += p.random(100);
  };

  p.draw = () => {
    if (frame === 0) {
      startMillis = p.millis();
      frame++;
    }

    const elapsed = p.millis() - startMillis;
    const t = p.map(elapsed, 0, duration, 0, 1);

    // Trayectoria logarítmica
    p.push();
    p.translate(0, 0);
    const posL = trayLogDown(t * 2, 0);
    const posU = trayLogUp(t * 2, 0);
    col2.setAlpha(255 * p.noise(ns));
    p.stroke(col2);
    p.noFill();
    p.ellipse(posL.x, posL.y, w * 0.02, w * 0.02);
    p.translate(0, h - w * 0.02);
    p.ellipse(posU.x, posU.y, w * 0.02, w * 0.02);
    p.pop();

    // Senoidal
    p.push();
    p.translate(0, w / 2);
    p.noFill();
    col3.setAlpha(255 * p.noise(ns));
    p.stroke(col3);
    const pos3 = traySin(t * 2, h * 0.1, -1.5, 0);
    p.ellipse(pos3.x, pos3.y, w * 0.015, w * 0.015);
    p.pop();

    // Líneas (Lissajous)
    p.push();
    p.translate(w / 2, h / 2);
    const pos2 = trayLissa(t, w * 0.4, 1, -1);
    const pos = trayLissa(t, w * 0.25, 5, 10);
    p.noFill();
    col1.setAlpha(255 * p.noise(ns));
    p.stroke(col1);
    p.line(pos.x, pos.y, pos2.x, pos2.y);
    p.pop();

    if (t <= 0.5) {
      ns += nsStep;
    } else {
      ns -= nsStep;
    }

    if (t >= 1) {
      p.noLoop();
      return;
    }
  };

  function trayLogDown(tiempo: number, finX: number) {
    const x = tiempo * (w - finX);
    const y = p.pow(h / 2, tiempo);
    return p.createVector(x, y);
  }

  function trayLogUp(tiempo: number, finX: number) {
    const x = tiempo * (w - finX);
    const y = -p.pow(h / 2, tiempo);
    return p.createVector(x, y);
  }

  function traySin(tiempo: number, alto: number, freq: number, offset: number) {
    const x = tiempo * w;
    const y = alto * p.sin(freq * p.TWO_PI * tiempo + offset);
    return p.createVector(x, y);
  }

  function trayLissa(tiempo: number, radio: number, perX: number, perY: number) {
    const x = radio * -p.cos(perX * p.TWO_PI * tiempo);
    const y = radio * -p.sin(perY * p.TWO_PI * tiempo);
    return p.createVector(x, y);
  }

  p.keyTyped = () => {
    if (p.key === "s") p.saveCanvas("rev", "png");
  };
};
