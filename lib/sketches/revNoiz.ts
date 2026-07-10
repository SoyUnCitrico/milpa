import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Paleta en RGB (alfa en 0–100, el colorMode nativo del sketch), salvo el rayo
 * que vive en HSB. EXCEPCIÓN de la regla cyberpunk: esta pieza conserva su
 * identidad de atardecer (naranjas/rojos del sol, morados del cielo, fondo
 * cálido oscuro). Solo el naranja del sol se acercó a `neon-ember` porque el
 * matiz ya coincidía de forma natural; el resto mantiene sus valores.
 */
const PALETA = {
  fondo: [30, 3, 0] as [number, number, number], // marrón casi negro, base cálida original
  solNaciente: [255, 106, 0] as [number, number, number], // antes rgb(247,92,1); acercado a neon-ember, mismo matiz
  solPoniente: [232, 20, 1] as [number, number, number], // rojo profundo, extremo final del degradado del sol
  cieloClaro: [96, 42, 105] as [number, number, number], // morado del cielo (parada media del degradado del horizonte)
  cieloProfundo: [39, 15, 60] as [number, number, number], // morado profundo (segunda parada del degradado)
  suelo: [9, 3, 30] as [number, number, number], // franja inferior, cierre del degradado del horizonte y relleno que ocluye el camino
  montana: [26, 9, 40] as [number, number, number], // silueta de montaña: morado profundo que recorta contra el cielo
  camino: [176, 64, 14] as [number, number, number], // naranja quemado oscuro: líneas del relieve hacia enfrente
  rayoHSB: [11, 47] as [number, number], // matiz y saturación (HSB) del rayo; el brillo lo da el timeline
};

/** Vértices del contorno del horizonte deformado por ruido. */
const DETALLE_HORIZONTE = 72;
/** Filas del camino de relieve hacia enfrente (joyplot) y paso en X por vértice. */
const FILAS_CAMINO = 26;
const PASO_CAMINO = 12;

/**
 * Port en modo instancia de `creativeCode/revNoiz.js`, revisado.
 * Atardecer generativo en RGB (1080×1350, vertical estilo Instagram): degradado
 * de sol/cielo por círculos + rayos de luz en el horizonte; timeline por
 * `millis()` (~42 s) que termina con `noLoop()`. Se elimina el `CCapture`.
 *
 * Cambios de esta revisión (ver familia "Revolución" en `algorithms.md`):
 * el círculo exterior del cielo dejó de ser una elipse limpia
 * (`horizonteRuido()`: contorno polar deformado con `noise(cos, sin, t)`,
 * color en degradado por timeline naranja del sol → morados del cielo →
 * morado oscuro del suelo, y alfa por ruido), se acumula una silueta de
 * montaña sobre el horizonte
 * (`montana()`, misma trayectoria circular con ruido de "Relieve Rev") y la
 * franja inferior se convierte en un camino de relieve que avanza hacia el
 * espectador (`caminoAlFrente()`, filas de ruido Perlin tipo joyplot que van
 * apareciendo con el timeline).
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

  const yHorizonte = (h * 2) / 3;
  const altoSuelo = h - yHorizonte;

  // Índices de ruido propios de la montaña y semilla del dominio del camino,
  // independientes del ruido del cielo.
  let nsMontana: number;
  let semillaCamino: number;

  // Colores p5 creados una sola vez en setup (solo se les ajusta el alfa por
  // frame, en vez de instanciar p5.Color nuevos en cada llamada de dibujo).
  let colSolNaciente: p5.Color, colSolPoniente: p5.Color;
  let colCieloClaro: p5.Color, colCieloProfundo: p5.Color;
  let colSuelo: p5.Color;
  let colMontana: p5.Color, colCamino: p5.Color;

  // Perfiles del camino cacheados: el dominio de ruido de cada fila es
  // estático, así que se muestrea una sola vez cuando la fila aparece.
  const perfilesCamino: { alturas: number[]; ruidoFila: number }[] = [];

  p.setup = () => {
    p.createCanvas(w, h);
    p.ellipseMode(p.CENTER);
    p.rectMode(p.CORNERS);
    p.frameRate(fps);

    p.colorMode(p.RGB, 255, 255, 255, 100);
    colSolNaciente = p.color(...PALETA.solNaciente);
    colSolPoniente = p.color(...PALETA.solPoniente);
    colCieloClaro = p.color(...PALETA.cieloClaro);
    colCieloProfundo = p.color(...PALETA.cieloProfundo);
    colSuelo = p.color(...PALETA.suelo);
    colMontana = p.color(...PALETA.montana);
    colCamino = p.color(...PALETA.camino);

    p.blendMode(p.BLEND);
    ns = p.random(100);
    nsMontana = p.random(100);
    semillaCamino = p.random(100);
    p.background(...PALETA.fondo);
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
      montana(p.map(t, 0, 1, 0.5, 1));
      caminoAlFrente(t);

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
      // Última pasada del camino a tiempo completo para no dejar filas
      // pendientes si el frame final saltó el cierre del timeline.
      caminoAlFrente(1);
      p.noLoop();
      return;
    }
  };

  function ligthRay(radioExt: number, separacion: number, anguloInicio: number, brillo: number) {
    p.push();
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.translate(w / 2, yHorizonte);
    p.strokeWeight(5);
    const x = radioExt * p.cos(p.PI * separacion) + anguloInicio;
    const y = radioExt * -p.sin(p.PI * separacion);

    p.stroke(PALETA.rayoHSB[0], PALETA.rayoHSB[1], brillo, 100);
    p.point(x, y);
    p.pop();
  }

  function sunset(tiempo: number, alfa: number) {
    p.colorMode(p.RGB, 255, 255, 255, 100);
    p.push();
    p.translate(w / 2, yHorizonte);
    p.noFill();
    p.strokeWeight(1);
    const sol = p.lerpColor(colSolNaciente, colSolPoniente, tiempo);
    const mult2 = 100 - 95 * p.pow(tiempo, 0.4);
    sol.setAlpha(mult2);

    p.stroke(sol);
    p.ellipse(0, 0, w * tiempo, w * tiempo);

    horizonteRuido(tiempo, alfa);

    p.translate(-w / 2, 0);
    p.noStroke();
    p.fill(...PALETA.suelo);
    p.rect(0, 1, w, h / 3);
    p.pop();
  }

  /**
   * Círculo exterior del cielo, ya no como elipse limpia: contorno de
   * vértices polares cuyo radio se deforma con `noise(cos, sin, t)`. El color
   * de las líneas hace un degradado a lo largo del timeline con paradas en el
   * naranja del sol → morado del cielo → morado profundo → morado oscuro del
   * suelo; el alfa del trazo lo sigue dando el ruido del frame. La coordenada
   * de tiempo del ruido avanza a `tiempo·5` para que la deformación varíe de
   * forma más notoria entre una línea y la siguiente.
   */
  function horizonteRuido(tiempo: number, alfa: number) {
    const radioBase = (w + (h * tiempo * 3) / 4) / 2;
    const amplitud = w * 0.05 + (alfa / 100) * w * 0.09;

    // Degradado por paradas: las primeras líneas salen naranjas cerca del
    // sol, pasan por los dos morados de la capa y terminan en el morado
    // oscuro del suelo al cierre del timeline.
    let cielo: p5.Color;
    if (tiempo < 0.4) {
      cielo = p.lerpColor(colSolNaciente, colCieloClaro, tiempo / 0.4);
    } else if (tiempo < 0.75) {
      cielo = p.lerpColor(colCieloClaro, colCieloProfundo, (tiempo - 0.4) / 0.35);
    } else {
      cielo = p.lerpColor(colCieloProfundo, colSuelo, (tiempo - 0.75) / 0.25);
    }
    cielo.setAlpha(alfa);
    p.stroke(cielo);
    p.strokeWeight(1);
    p.noFill();
    p.beginShape();
    for (let i = 0; i <= DETALLE_HORIZONTE; i++) {
      const angulo = (p.TWO_PI * i) / DETALLE_HORIZONTE;
      const nx = p.cos(angulo);
      const ny = p.sin(angulo);
      const deformacion = p.noise(nx + 1, ny + 1, tiempo * 5);
      const radio = radioBase + (deformacion - 0.5) * amplitud;
      p.vertex(radio * nx, radio * ny);
    }
    p.endShape(p.CLOSE);
  }

  /**
   * Relieve de montaña centrado en el horizonte, como en "Relieve Rev"
   * (`sunsetREv.ts`): cada frame traza una línea entre una órbita exterior y
   * una órbita interior cuya componente vertical se deforma con ruido, con el
   * ángulo mapeado a media vuelta a lo largo del timeline. Se acumula sobre
   * el cielo formando una silueta oscura que recorta contra el degradado.
   */
  function montana(tiempo: number) {
    const radioInt = w * 0.18;
    const radioExt = w * 0.45;
    const n = p.noise(nsMontana);
    nsMontana += nsStep * 2;

    p.push();
    p.translate(w / 2, yHorizonte);
    const x = radioExt * p.cos(p.TWO_PI * tiempo);
    const y = radioExt * -p.sin(p.TWO_PI * tiempo);
    const a = radioInt * p.cos(p.TWO_PI * tiempo);
    const b = -radioInt * n * -p.sin(p.TWO_PI * tiempo);

    colMontana.setAlpha(n * 45 + 30);
    p.stroke(colMontana);
    p.strokeWeight(n * 2.2 + 0.5);
    p.line(a, b, x, y);
    p.pop();
  }

  /** Muestrea (una sola vez) el perfil de ruido de una fila del camino. */
  function perfilFila(fila: number) {
    const frac = fila / FILAS_CAMINO;
    const amplitud = altoSuelo * 0.32 * p.pow(frac, 1.4);
    const alturas: number[] = [];
    for (let x = 0; x <= w; x += PASO_CAMINO) {
      alturas.push(amplitud * p.noise(x * 0.004 + semillaCamino, fila * 0.35));
    }
    return { alturas, ruidoFila: p.noise(semillaCamino + fila * 0.61) };
  }

  /**
   * Camino montañoso hacia enfrente (relieve tipo joyplot / "FFT en el
   * tiempo"): desde el horizonte hacia abajo, cada fila es un perfil de ruido
   * Perlin (`noise(x·escala, fila·escala)`) dibujado con `vertex()`. Las
   * filas cercanas al espectador van más separadas y con más amplitud
   * (perspectiva por potencia de `frac`), con opacidad y grosor modulados por
   * un ruido propio por fila. Las filas aparecen una a una conforme corre el
   * timeline; el relleno color suelo de cada fila ocluye a las de atrás.
   */
  function caminoAlFrente(tiempo: number) {
    const filasVisibles = p.min(FILAS_CAMINO, p.floor(tiempo * FILAS_CAMINO));
    if (filasVisibles < 1) return;

    p.push();
    p.fill(...PALETA.suelo);
    for (let fila = 1; fila <= filasVisibles; fila++) {
      if (!perfilesCamino[fila]) perfilesCamino[fila] = perfilFila(fila);
      const { alturas, ruidoFila } = perfilesCamino[fila];
      const frac = fila / FILAS_CAMINO;
      const yFila = yHorizonte + altoSuelo * p.pow(frac, 1.6);

      colCamino.setAlpha(18 + ruidoFila * 50 + frac * 20);
      p.stroke(colCamino);
      p.strokeWeight(0.5 + frac * 1.6 + ruidoFila * 0.8);
      p.beginShape();
      p.vertex(-4, h + 4);
      for (let i = 0; i < alturas.length; i++) {
        p.vertex(i * PASO_CAMINO, yFila - alturas[i]);
      }
      p.vertex(w + 4, h + 4);
      p.endShape(p.CLOSE);
    }
    p.pop();
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("rev-noiz", "png");
  };
};
