import type p5 from "p5";
import type { SketchFactory } from "../types";
import { Knob } from "../bibliotecas/knob";

/**
 * Rediseño en modo instancia de `creativeCode/trayectorias.js`.
 *
 * Composición en CAPAS TRANSLÚCIDAS de estética cyberpunk que se acumulan sobre
 * un fondo persistente (el `background` solo se pinta en `setup` / al reiniciar):
 *   1. Fondo — anillos concéntricos que crecen desde el centro, deformados por
 *      ruido Perlin, con opacidad modulada por el radio y el ruido.
 *   2. Senoidal — la línea senoidal recorriendo el canvas de ARRIBA HACIA ABAJO.
 *   3. Lissajous — figura central cuyos períodos X/Y se controlan con dos `Knob`;
 *      termina con `noLoop()` al completar el trazo y REINICIA si se cambia un
 *      período.
 *   4. Convergencia — dos trayectorias que convergen en el centro-superior del
 *      canvas, dibujadas con BRECHAS de líneas diagonales (batches), no una curva
 *      continua.
 *
 * Se elimina el `CCapture` y la trayectoria logarítmica original; los colores RGB
 * crudos pasan a la paleta cyberpunk `PALETA`.
 */

const SLUG = "trayectorias";

/**
 * Paleta cyberpunk (tokens del sitio). Todo se dibuja con alfa bajo para que las
 * capas se acumulen/superpongan.
 */
const PALETA = {
  fondo: "#050805", // matrix-black
  anillos: "#00e5ff", // cian cyberpunk (capa de fondo)
  senoidal: "#00ff41", // verde neón matrix (capa senoidal)
  lissajous: "#ff8c1a", // naranja neón (figura central)
  convergenciaA: "#a855f7", // violeta (una de las dos trayectorias)
  convergenciaB: "#c98bff", // orquídea (la otra trayectoria)
} as const;

export const trayectorias: SketchFactory = (p: p5) => {
  const w = 1000;
  const h = 1000;

  // Punto de convergencia: centro en X, arriba en Y.
  const convX = w / 2;
  const convY = h * 0.08;

  let colAnillo: p5.Color,
    colSenoidal: p5.Color,
    colLissa: p5.Color,
    colConvA: p5.Color,
    colConvB: p5.Color,
    back: p5.Color;

  let ns = 0;
  const nsStep = 0.01;
  const duration = 60000;

  let frame = 0;
  let startMillis: number;
  const fps = 15;

  // Períodos de la figura de Lissajous, controlados por los knobs.
  let perX = 3;
  let perY = 2;

  // Punto previo del trazo de Lissajous (para unir segmentos consecutivos).
  let prevLissa: p5.Vector | null = null;

  p.setup = () => {
    p.createCanvas(w, h);
    p.frameRate(fps);

    colAnillo = p.color(PALETA.anillos);
    colSenoidal = p.color(PALETA.senoidal);
    colLissa = p.color(PALETA.lissajous);
    colConvA = p.color(PALETA.convergenciaA);
    colConvB = p.color(PALETA.convergenciaB);
    back = p.color(PALETA.fondo);

    p.background(back);
    ns += p.random(100);

    // Controles: proporciones (períodos) de la figura de Lissajous.
    const knobX = new Knob(p, {
      etiqueta: "Período X",
      min: 1,
      max: 16,
      valor: perX,
      paso: 1,
      onChange: (v) => {
        perX = v;
        reiniciar();
      },
    });
    knobX.position(10, 10);

    const knobY = new Knob(p, {
      etiqueta: "Período Y",
      min: 1,
      max: 16,
      valor: perY,
      paso: 1,
      onChange: (v) => {
        perY = v;
        reiniciar();
      },
    });
    knobY.position(70, 10);
  };

  p.draw = () => {
    if (frame === 0) {
      startMillis = p.millis();
      frame++;
    }

    const elapsed = p.millis() - startMillis;
    const t = p.map(elapsed, 0, duration, 0, 1);

    fondoConcentrico(t); // capa 1 — al fondo
    capaSenoidal(t); // capa 2
    capaLissajous(t); // capa 3
    capaConvergencia(t); // capa 4 — al frente

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

  /** Reinicia el trazo desde cero (se llama al cambiar un período de Lissajous). */
  function reiniciar() {
    frame = 0;
    ns = p.random(100);
    prevLissa = null;
    p.background(back);
    p.loop();
  }

  // CAPA 1 — Fondo: anillos concéntricos que crecen desde el centro, cada uno
  // deformado por ruido Perlin, con la opacidad del stroke modulada por el radio
  // y el ruido.
  function fondoConcentrico(t: number) {
    p.push();
    p.translate(w / 2, h / 2);
    p.noFill();

    const rMax = w * 0.72;
    const r = t * rMax;
    const n = p.noise(r * 0.01, ns);
    // Anillos exteriores más tenues; el ruido modula el brillo puntual.
    const alfa = p.map(r, 0, rMax, 45, 6) * (0.4 + n);
    colAnillo.setAlpha(p.constrain(alfa, 0, 60));
    p.stroke(colAnillo);
    p.strokeWeight(0.6 + n);

    const pasos = 120;
    const amp = w * 0.06;
    p.beginShape();
    for (let i = 0; i <= pasos; i++) {
      const ang = (i / pasos) * p.TWO_PI;
      const nd = p.noise(p.cos(ang) + 1, p.sin(ang) + 1, r * 0.006 + ns);
      const rr = r + nd * amp;
      p.vertex(rr * p.cos(ang), rr * p.sin(ang));
    }
    p.endShape(p.CLOSE);
    p.pop();
  }

  // CAPA 2 — Senoidal: recorre el canvas de ARRIBA HACIA ABAJO (Y avanza, X
  // oscila alrededor del centro).
  function capaSenoidal(t: number) {
    p.push();
    p.translate(w / 2, 0);
    p.noFill();
    const n = p.noise(ns);
    colSenoidal.setAlpha(40 + n * 90);
    p.stroke(colSenoidal);
    p.strokeWeight(1 + n * 2);
    const pos = traySin(t, w * 0.18, 3, 0);
    p.ellipse(pos.x, pos.y, w * 0.012, w * 0.012);
    p.pop();
  }

  // CAPA 3 — Lissajous central: se traza como segmentos unidos sobre el tiempo.
  function capaLissajous(t: number) {
    p.push();
    p.translate(w / 2, h / 2);
    p.noFill();
    const n = p.noise(ns);
    colLissa.setAlpha(50 + n * 120);
    p.stroke(colLissa);
    p.strokeWeight(1.5);
    let xP = p.sin(t * p.TWO_PI * perX);
    let yP = p.cos(t * p.TWO_PI * perY);
    const pos = trayLissa(t, w * 0.3, perX, perY);
    if (prevLissa) {
      p.strokeWeight(1.5 + n * 2);
      //p.line(prevLissa.x, prevLissa.y, pos.x, pos.y);
      p.line(xP, yP, pos.x, pos.y);
    }
    prevLissa = pos;
    p.pop();
  }

  // CAPA 4 — Convergencia: dos trayectorias que convergen en el centro-superior,
  // dibujadas con BRECHAS de líneas diagonales (batches espaciados, no una curva
  // continua).
  function capaConvergencia(t: number) {
    // Brechas: solo se dibuja un batch cada tres frames.
    if (p.frameCount % 3 !== 0) return;
    const izq = trayConverge(t, w * 0.05, h * 0.95, (p.noise(ns + t * 0.01) * 20), 100);
    const der = trayConverge(t, w * 0.95, h * 0.95,0, -100);
    brechaDiagonales(izq, colConvA);
    brechaDiagonales(der, colConvB);
  }

  /** Grupo de líneas diagonales inclinadas hacia el punto de convergencia. */
  function brechaDiagonales(pos: p5.Vector, col: p5.Color) {
    const n = p.noise(ns + pos.y * 0.01);
    col.setAlpha(30 + n * 70);
    p.stroke(col);
    p.strokeWeight(1);
    const ang = p.atan2(convY - pos.y, convX - pos.x);
    const num = 6;
    const largo = w * 0.05;
    const sep = w * 0.012;
    for (let i = 0; i < num; i++) {
      const off = (i - (num - 1) / 2) * sep;
      const px = pos.x + off * p.cos(ang + p.HALF_PI);
      const py = pos.y + off * p.sin(ang + p.HALF_PI);
      p.line(px, py, px + largo * p.cos(ang), py + largo * p.sin(ang));
    }
  }

  // --- Trayectorias paramétricas ---

  function traySin(tiempo: number, ancho: number, freq: number, offset: number) {
    const y = tiempo * h;
    const x = ancho * p.sin(freq * p.TWO_PI * tiempo + offset);
    return p.createVector(x, y);
  }

  function trayLissa(tiempo: number, radio: number, periodoX: number, periodoY: number) {
    const x = radio * -p.cos(periodoX * p.TWO_PI * tiempo);
    const y = radio * -p.sin(periodoY * p.TWO_PI * tiempo);
    return p.createVector(x, y);
  }

  function trayConverge(tiempo: number, iniX: number, iniY: number, ruidoAmp: number = 0, sinAmp: number = 0) {
    let x = p.lerp(iniX, convX, tiempo) + p.random(-ruidoAmp, ruidoAmp);
    let y = p.lerp(iniY, convY, tiempo) + p.random(-ruidoAmp, ruidoAmp);
    if(sinAmp !== 0) {
      x += p.cos(tiempo * p.TWO_PI) * sinAmp;
      y += p.sin(tiempo * p.TWO_PI) * sinAmp;
    }
    return p.createVector(x, y);
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
  };
};
