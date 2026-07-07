import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/sunsetREv.js`.
 * Relieve de montaña generativo (1080×1350) trazado por una trayectoria circular
 * con ruido sobre una franja temporal; termina con `noLoop()`. Se elimina toda
 * la lógica de `CCapture` (que en el original estaba activa). Los `color()`
 * globales implícitos pasan a clausura.
 */
export const sunsetREv: SketchFactory = (p: p5) => {
  const w = 1080;
  const h = 1350;
  let t: number;
  let ns: number;
  const nsStep = 0.0075 / 2;
  const duration = 42190;
  let frame = 0;
  let startMillis: number;
  const fps = 30;

  p.setup = () => {
    p.createCanvas(w, h);
    p.ellipseMode(p.CENTER);
    p.rectMode(p.CORNERS);
    p.frameRate(fps);

    p.colorMode(p.RGB, 255, 255, 255, 100);
    p.blendMode(p.BLEND);
    ns = p.random(100);
    p.background(0, 0);
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
      const t3 = p.map(t, 0, 1, 0.5, 1);
      relieve(t3, w * 0.2, w * 0.8, ns);
      ns += nsStep;
    } else if (t > 1) {
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

    const relieveCol = p.color(21, 35, 64);
    relieveCol.setAlpha(p.noise(ruido) * 60 + 40);
    p.stroke(relieveCol);
    p.line(a, b, x, y);
    p.pop();
  }

  p.keyTyped = () => {
    if (p.key === "s") p.saveCanvas("rev", "png");
  };
};
