import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Paleta en RGB (alfa en 0–100, el colorMode nativo del sketch). Identidad
 * original: un único azul marino apagado rgb(21, 35, 64) acumulándose sobre
 * fondo transparente. Se re-mapea a los tonos del sitio conservando ese
 * carácter oscuro/silueta: el relieve pasa al verde profundo de línea
 * (matrix-line) y la bruma de fondo usa el verde apagado (matrix-dim) como
 * neblina discreta, nunca protagonista.
 */
const PALETA = {
  relieve: [117, 51, 12] as [number, number, number], // antes rgb(117, 51, 12): verde profundo, silueta de montaña
  bruma: [0, 179, 65] as [number, number, number], // verde apagado: barrido horizontal detrás del relieve
};

/**
 * Port en modo instancia de `creativeCode/sunsetREv.js`.
 * Relieve de montaña generativo (1080×1350) trazado por una trayectoria circular
 * con ruido sobre una franja temporal; termina con `noLoop()`. Se elimina toda
 * la lógica de `CCapture` (que en el original estaba activa).
 *
 * Pieza de la familia "Revolución" (ver `algorithms.md`). En esta revisión se
 * añade `bruma()`: un barrido de líneas horizontales que atraviesa el canvas y
 * baja en Y al ritmo del timeline, con opacidad (y grosor sutil) modulados por
 * un índice de ruido propio. Como el lienzo acumula sin clear, cada frame
 * dibuja su línea de bruma ANTES del trazo de relieve, de modo que la montaña
 * queda legible encima de la textura.
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

  // Barrido de bruma: última fila ya barrida, separación entre líneas y
  // su propio índice de ruido (independiente del ruido del relieve).
  let yBruma = 0;
  const pasoBruma = 3;
  let nsBruma = 0;

  // Colores creados una sola vez (solo se les ajusta el alfa por frame),
  // en vez de instanciar un p5.Color nuevo en cada llamada de dibujo.
  let colRelieve: p5.Color;
  let colBruma: p5.Color;

  p.setup = () => {
    p.createCanvas(w, h);
    p.ellipseMode(p.CENTER);
    p.rectMode(p.CORNERS);
    p.frameRate(fps);

    p.colorMode(p.RGB, 255, 255, 255, 100);
    p.blendMode(p.BLEND);
    ns = p.random(100);
    nsBruma = p.random(100);
    colRelieve = p.color(...PALETA.relieve);
    colBruma = p.color(...PALETA.bruma);
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
      bruma(t);
      const t3 = p.map(t, 0, 1, 0.5, 1);
      relieve(t3, w * 0.2, w * 0.8, ns);
      ns += nsStep;
    } else if (t > 1) {
      p.noLoop();
      return;
    }
  };

  /**
   * Barrido de fondo: líneas horizontales de lado a lado del canvas que
   * avanzan hacia abajo conforme corre el timeline (la fila objetivo es
   * `t · h`). Cada línea nueva lee su propio índice de ruido para modular la
   * opacidad (y apenas el grosor), grabando una textura de neblina detrás
   * del relieve que se acumula encima.
   */
  function bruma(tiempo: number) {
    const yObjetivo = tiempo * h;
    while (yBruma + pasoBruma <= yObjetivo) {
      yBruma += pasoBruma;
      const ruido = p.noise(nsBruma);
      colBruma.setAlpha(ruido * 26 + 4);
      p.stroke(colBruma);
      p.strokeWeight(ruido * 1.2 + 0.3);
      p.line(0, yBruma, w, yBruma);
      nsBruma += 0.035;
    }
  }

  function relieve(tiempo: number, radioInt: number, radioExt: number, ruido: number) {
    p.push();
    p.translate(w / 2, (h * 2) / 3);

    const n = p.noise(ruido);
    const x = radioExt * p.cos(p.TWO_PI * tiempo);
    const y = radioExt * -p.sin(p.TWO_PI * tiempo);
    const a = radioInt * p.cos(p.TWO_PI * tiempo);
    const b = -radioInt * n * -p.sin(p.TWO_PI * tiempo);

    colRelieve.setAlpha(n * 60 + 40);
    p.stroke(colRelieve);
    p.strokeWeight(n * 2 + 0.4);
    p.line(a, b, x, y);
    p.pop();
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("sunset-rev", "png");
  };
};
