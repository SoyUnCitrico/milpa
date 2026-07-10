import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Paleta en HSB (360, 100, 100, 100) — el colorMode nativo del sketch.
 * A diferencia de Revolution II (duotono verde/vino), aquí cada fase del
 * timeline tiene su propio carácter cromático, dentro de la familia de tokens
 * del sitio (matrix-* / neon-* de tailwind.config.ts, sin copiar valores
 * literalmente): atardecer cálido ámbar/ember con horizonte violeta, rayo
 * verde neón con destellos ámbar, relieve orquídea. Los verdes pálido/apagado
 * quedan para los acentos geométricos.
 */
const PALETA = {
  fondo: [140, 45, 3] as [number, number, number], // negro verdoso, casi matrix-black
  sol: [34, 74, 100] as [number, number, number], // ámbar: círculo interior del atardecer y destellos
  ember: [25, 100, 100] as [number, number, number], // naranja profundo: extremo cálido del horizonte y semicírculos
  violeta: [271, 65, 97] as [number, number, number], // extremo frío del horizonte deformado
  orquidea: [273, 43, 100] as [number, number, number], // trazos del relieve final
  rayo: [135, 100, 100] as [number, number, number], // verde neón: rayo de luz
  verdePalido: [139, 50, 100] as [number, number, number], // retícula de puntos
  verdeDim: [142, 100, 70] as [number, number, number], // diagonal estructural
};

/** Vértices del contorno del horizonte deformado por ruido. */
const DETALLE_HORIZONTE = 72;

/**
 * Port en modo instancia de `creativeCode/rev3.js`, revisado.
 * Timeline por `millis()` (≈30 s): atardecer → rayo de luz → relieve, y
 * termina con `noLoop()`. Se elimina el `CCapture` original (export de video).
 *
 * Cambios de esta revisión (ver familia "Revolución" en `algorithms.md`):
 * el círculo exterior del atardecer dejó de ser una elipse limpia (contorno
 * polar deformado por ruido Perlin, color violeta↔ember), el ruido modula
 * grosor y opacidad en las tres fases, y una capa de acentos tipo Kandinsky
 * (círculos concéntricos, semicírculos, diagonales, retícula) se posa entre
 * fases, dibujada una sola vez.
 */
export const rev3: SketchFactory = (p: p5) => {
  const w = 800;
  const h = 1000;

  let ns: number;
  const nsStep = 0.009;
  const duration = 30000;

  let frame = 0;
  let startMillis: number;
  const fps = 15;

  // Colores p5 para interpolar el horizonte (creados una vez en setup).
  let colorVioleta: p5.Color, colorEmber: p5.Color;

  // Acentos Kandinsky: cada capa se dibuja una sola vez sobre lo acumulado.
  let acentosHorizonteListos = false;
  let acentosFinalesListos = false;

  p.setup = () => {
    p.createCanvas(w, h);
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.ellipseMode(p.CENTER);
    p.rectMode(p.CORNERS);
    p.frameRate(fps);
    colorVioleta = p.color(...PALETA.violeta);
    colorEmber = p.color(...PALETA.ember);
    ns = p.random(100);
    p.background(...PALETA.fondo);
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
      if (!acentosHorizonteListos) {
        circulosConcentricos(w * 0.22, h * 0.15, w * 0.09);
        semicirculos();
        acentosHorizonteListos = true;
      }
      ligtRay(t, w * 0.55, ns);
    } else if (t > 1.5 && t <= 2) {
      relieve(t, w * 0.3, w * 0.75, ns);
    } else if (t > 2) {
      if (!acentosFinalesListos) {
        diagonales();
        reticula(w * 0.08, h * 0.82);
        acentosFinalesListos = true;
      }
      p.noLoop();
      return;
    }
    ns += nsStep;
  };

  function relieve(tiempo: number, radioInt: number, radioExt: number, ruido: number) {
    const n = p.noise(ruido);
    p.push();
    p.translate(w / 2, (h * 2) / 3);

    const x = radioExt * p.cos(p.TWO_PI * tiempo);
    const y = radioExt * -p.sin(p.TWO_PI * tiempo);
    const a = radioInt * p.cos(p.TWO_PI * tiempo);
    const b = -radioInt * n * -p.sin(p.TWO_PI * tiempo);

    // Orquídea con saturación, brillo, alfa y grosor modulados por ruido.
    p.strokeWeight(0.4 + n * 2);
    p.stroke(
      PALETA.orquidea[0],
      PALETA.orquidea[1] * (0.5 + n * 0.5),
      PALETA.orquidea[2] * (0.4 + n * 0.6),
      n * 90 + 10
    );
    p.line(a, b, x, y);
    p.pop();
  }

  function ligtRay(tiempo: number, radioExt: number, ruido: number) {
    const n = p.noise(ruido);
    p.push();
    p.translate(w / 2, (h * 2) / 3);

    const x = radioExt * p.cos(p.PI * 64 * tiempo);
    const y = radioExt * -p.sin(p.PI * 64 * tiempo);

    // Verde neón con grosor y alfa respirando con el ruido; cuando el ruido
    // pica alto, el rayo destella en ámbar.
    p.strokeWeight(0.5 + n * 2.5);
    if (n > 0.66) {
      p.stroke(...PALETA.sol, n * 60 + 20);
    } else {
      p.stroke(...PALETA.rayo, n * 40 + 10);
    }
    p.line(0, 0, x, y);
    p.pop();
  }

  function sunset(tiempo: number) {
    const n = p.noise(ns);
    p.push();
    p.translate(w / 2, (h * 2) / 3);
    p.noFill();

    // Sol ámbar en expansión: alfa decayendo como en el original, grosor
    // respirando con el ruido.
    p.strokeWeight(0.6 + n * 2);
    p.stroke(...PALETA.sol, (40 - p.pow(40, tiempo)) * (0.5 + n * 0.5));
    p.ellipse(0, 0, w * tiempo, w * tiempo);

    horizonteDeformado(tiempo, n);

    // Franja oscura que recorta el tercio inferior de la composición.
    p.translate(-w / 2, 0);
    p.noStroke();
    p.fill(...PALETA.fondo);
    p.rect(0, 0, w, h / 3);
    p.pop();
  }

  /**
   * Círculo exterior del atardecer, ya no como elipse limpia: contorno de
   * vértices polares cuyo radio se deforma con `noise(cos, sin, t)`. El color
   * se interpola violeta↔ember según el ruido del frame y el alfa crece
   * logarítmicamente (fórmula del original), también modulado por ruido.
   */
  function horizonteDeformado(tiempo: number, ruido: number) {
    const radioBase = (w + (h * tiempo * 3) / 4) / 2;
    const amplitud = w * 0.06 + ruido * w * 0.08;
    const alfa = 100 * p.log(1 + tiempo * 1.72);

    const colorHorizonte = p.lerpColor(colorVioleta, colorEmber, ruido);
    colorHorizonte.setAlpha(alfa * (0.35 + ruido * 0.65));
    p.stroke(colorHorizonte);
    p.strokeWeight(0.8 + ruido * 2.4);
    p.noFill();
    p.beginShape();
    for (let i = 0; i <= DETALLE_HORIZONTE; i++) {
      const angulo = (p.TWO_PI * i) / DETALLE_HORIZONTE;
      const nx = p.cos(angulo);
      const ny = p.sin(angulo);
      const deformacion = p.noise(nx + 1, ny + 1, tiempo * 3);
      const radio = radioBase + (deformacion - 0.5) * amplitud;
      p.vertex(radio * nx, radio * ny);
    }
    p.endShape(p.CLOSE);
  }

  /** Acento Kandinsky: círculos concéntricos alternando verde neón, ámbar y orquídea. */
  function circulosConcentricos(cx: number, cy: number, radioMax: number) {
    const anillos = [PALETA.rayo, PALETA.sol, PALETA.orquidea, PALETA.rayo, PALETA.sol];
    p.push();
    p.translate(cx, cy);
    p.noFill();
    for (let i = 0; i < anillos.length; i++) {
      const d = radioMax * 2 * (1 - i / anillos.length);
      p.strokeWeight(1 + i * 0.6);
      p.stroke(...anillos[i], 80);
      p.ellipse(0, 0, d, d);
    }
    // Punto central relleno en ember.
    p.noStroke();
    p.fill(...PALETA.ember, 90);
    p.ellipse(0, 0, radioMax * 0.28, radioMax * 0.28);
    p.pop();
  }

  /** Acento Kandinsky: semicírculos apoyados sobre la línea del horizonte. */
  function semicirculos() {
    const yHorizonte = (h * 2) / 3;
    p.push();
    p.noFill();
    p.stroke(...PALETA.ember, 85);
    p.strokeWeight(2.5);
    p.arc(w * 0.78, yHorizonte, w * 0.16, w * 0.16, p.PI, p.TWO_PI);
    p.stroke(...PALETA.sol, 70);
    p.strokeWeight(1.5);
    p.arc(w * 0.78, yHorizonte, w * 0.24, w * 0.24, p.PI, p.TWO_PI);
    p.stroke(...PALETA.violeta, 60);
    p.strokeWeight(1);
    p.arc(w * 0.16, yHorizonte, w * 0.1, w * 0.1, p.PI, p.TWO_PI);
    p.pop();
  }

  /** Acento Kandinsky: diagonales que cruzan la composición hacia el centro del relieve. */
  function diagonales() {
    p.push();
    p.stroke(...PALETA.verdeDim, 60);
    p.strokeWeight(1);
    p.line(w * 0.05, h * 0.05, w * 0.95, h * 0.9);
    p.stroke(...PALETA.sol, 75);
    p.strokeWeight(2.5);
    p.line(w * 0.12, h * 0.02, w * 0.7, h * 0.98);
    p.stroke(...PALETA.orquidea, 50);
    p.strokeWeight(0.8);
    p.line(0, h * 0.55, w, h * 0.35);
    p.pop();
  }

  /** Acento Kandinsky: pequeña retícula de puntos sobre la franja oscura inferior. */
  function reticula(cx: number, cy: number) {
    const paso = w * 0.022;
    p.push();
    p.translate(cx, cy);
    p.noStroke();
    p.fill(...PALETA.verdePalido, 70);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        p.ellipse(i * paso, j * paso, 3, 3);
      }
    }
    p.pop();
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("rev3", "png");
  };
};
