import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/noiseCircle.js`.
 *
 * Línea giratoria sobre fondo negro persistente: el extremo orbita el centro y
 * el trazo se modula con ruido Perlin (`noise`). Se omite el `console.log(sC)`
 * de depuración del original (corría cada frame y siempre imprimía 0).
 */
export const noiseCircle: SketchFactory = (p: p5) => {
  let x = 0;
  let y = 0;
  let angle = 0;
  const radio = 430;
  let index = 0;

  p.setup = () => {
    p.createCanvas(1000, 1000);
    p.background(0);

    p.push();
    p.translate(p.width / 2, p.height / 2);
    p.stroke(255);
    p.strokeWeight(5);
    p.point(0, 0);
    p.pop();
  };

  p.draw = () => {
    p.push();
    p.translate(p.width / 2, p.height / 2);
    x = radio * p.cos(angle);
    y = radio * p.sin(angle);
    p.stroke(200, p.noise(index * 4) * 255);
    p.strokeWeight(p.noise(index) * 5);
    p.point(x, y);
    p.stroke(p.noise(index) * 255, p.noise(index * 3) * 255);
    p.strokeWeight(1);
    p.line(0, 0, x, y);
    p.pop();

    angle += 0.005;
    angle %= p.TWO_PI;

    index += 0.007;
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("noise-circle", "png");
  };
};
