import type p5 from "p5";
import { PloterFourier } from "../bibliotecas/ploterFourier";
import { Knob } from "../bibliotecas/knob";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/spectografo.js`, extendido.
 *
 * Visualizador de series de Fourier: dibuja los epiciclos (espirógrafo) y la
 * onda resultante en el tiempo. Cambios sobre el original:
 *   - Más tipos de onda representables, seleccionables con las teclas 1-7
 *     (triangular, cuadrada, sierra, senoidal, sierra inversa, pulso, impulso).
 *   - Los tres sliders se reemplazan por `Knob` (armónicos, amplitud, velocidad).
 *   - Arranca con MÁXIMOS armónicos, y amplitud/velocidad medias.
 *   - Paleta cyberpunk (definida en `PloterFourier`, compartida con `sumador`).
 *   - Recuadro de texto sobre el canvas con la onda actual y los parámetros.
 * Sin audio.
 */

const SLUG = "spectografo";

const RANGO = {
  armMin: 1,
  armMax: 30,
  ampMin: 0,
  ampMax: 100,
  velMin: 0.005,
  velMax: 0.05,
};

/** Defaults al montar: máximos armónicos, amplitud y velocidad medias. */
const DEFAULTS = {
  armonicos: RANGO.armMax, // máximos armónicos
  amplitud: (RANGO.ampMin + RANGO.ampMax) / 2, // amplitud media (50)
  velocidad: (RANGO.velMin + RANGO.velMax) / 2, // velocidad media (0.0275)
  onda: 2, // Cuadrada — figura icónica con muchos armónicos
};

/**
 * Ondas disponibles: `tecla` (número) → `id` de función en `PloterFourier`.
 * Los ids saltan del 4 al 6 porque el 5 lo reserva `sumador` (armónicos con
 * amplitud decreciente), que no se expone aquí. Es también la leyenda del panel.
 */
const ONDAS: { tecla: string; id: number; nombre: string }[] = [
  { tecla: "1", id: 1, nombre: "Triangular" },
  { tecla: "2", id: 2, nombre: "Cuadrada" },
  { tecla: "3", id: 3, nombre: "Sierra" },
  { tecla: "4", id: 4, nombre: "Senoidal" },
  { tecla: "5", id: 6, nombre: "Sierra inversa" },
  { tecla: "6", id: 7, nombre: "Pulso" },
  { tecla: "7", id: 8, nombre: "Impulso" },
];

/** Paleta del panel de texto (tokens del sitio). */
const PALETA = {
  panelFondo: "#0a140d", // matrix-panel
  panelBorde: "#143b22", // matrix-line
  titulo: "#ff8c1a", // neon-orange
  texto: "#7fffa8", // matrix-text
  valor: "#00ff41", // matrix-green
  tenue: "#00b341", // matrix-dim
};

export const spectografo: SketchFactory = (p: p5) => {
  const w = 800;
  const h = 500;

  let grafica: PloterFourier;

  // Estado espejo para el panel de texto.
  let armonicos = DEFAULTS.armonicos;
  let amplitud = DEFAULTS.amplitud;
  let velocidad = DEFAULTS.velocidad;
  let ondaActual = DEFAULTS.onda;

  const nombreOnda = () => ONDAS.find((o) => o.id === ondaActual)?.nombre ?? "—";
  const teclaOnda = () => ONDAS.find((o) => o.id === ondaActual)?.tecla ?? "—";

  p.setup = () => {
    p.createCanvas(w, h);

    const centroCirculo = p.createVector(w * 0.2, h * 0.5);
    const inicioGrafica = p.createVector(w * 0.5, h * 0.5);
    grafica = new PloterFourier(p, centroCirculo, inicioGrafica, amplitud, armonicos);
    grafica.changeFunction(ondaActual);
    grafica.setTimeStep(velocidad);

    // Perillas (reemplazan a los sliders): armónicos, amplitud, velocidad.
    const knobArm = new Knob(p, {
      etiqueta: "Armónicos",
      min: RANGO.armMin,
      max: RANGO.armMax,
      valor: armonicos,
      paso: 1,
      onChange: (v) => {
        armonicos = v;
        grafica.setArmonicos(v);
      },
    });
    knobArm.position(24, h - 92);

    const knobAmp = new Knob(p, {
      etiqueta: "Amplitud",
      min: RANGO.ampMin,
      max: RANGO.ampMax,
      valor: amplitud,
      paso: 1,
      onChange: (v) => {
        amplitud = v;
        grafica.setAmp(v);
      },
    });
    knobAmp.position(96, h - 92);

    const knobVel = new Knob(p, {
      etiqueta: "Velocidad",
      min: RANGO.velMin,
      max: RANGO.velMax,
      valor: velocidad,
      paso: 0.001,
      onChange: (v) => {
        velocidad = v;
        grafica.setTimeStep(v);
      },
    });
    knobVel.position(168, h - 92);
  };

  p.draw = () => {
    p.background(0);
    grafica.actualizar();
    dibujaPanel();
  };

  // Recuadro de texto sobre el canvas: onda actual, parámetros y leyenda de
  // teclas. Se ancla arriba a la derecha, donde el trazo temporal deja hueco.
  function dibujaPanel() {
    const px = w - 262;
    const py = 14;
    const pw = 248;
    const ph = 182;

    p.push();
    p.rectMode(p.CORNER);
    const fondo = p.color(PALETA.panelFondo);
    fondo.setAlpha(215);
    p.fill(fondo);
    p.stroke(PALETA.panelBorde);
    p.strokeWeight(1);
    p.rect(px, py, pw, ph, 6);
    p.noStroke();
    p.textFont("monospace");
    p.textAlign(p.LEFT, p.TOP);

    let y = py + 12;
    const x = px + 14;

    p.fill(PALETA.titulo);
    p.textStyle(p.BOLD);
    p.textSize(13);
    p.text("FOURIER · ESPECTRÓGRAFO", x, y);
    y += 22;

    p.textStyle(p.NORMAL);
    p.textSize(12);
    // Onda actual
    p.fill(PALETA.texto);
    p.text("Onda:", x, y);
    p.fill(PALETA.valor);
    p.text(`${nombreOnda()}  [${teclaOnda()}]`, x + 46, y);
    y += 18;
    // Parámetros
    p.fill(PALETA.texto);
    p.text(`Armónicos: `, x, y);
    p.fill(PALETA.valor);
    p.text(`${armonicos}`, x + 92, y);
    y += 16;
    p.fill(PALETA.texto);
    p.text(`Amplitud:  `, x, y);
    p.fill(PALETA.valor);
    p.text(`${amplitud}`, x + 92, y);
    y += 16;
    p.fill(PALETA.texto);
    p.text(`Velocidad: `, x, y);
    p.fill(PALETA.valor);
    p.text(`${velocidad.toFixed(3)}`, x + 92, y);
    y += 20;

    // Leyenda de teclas
    p.fill(PALETA.tenue);
    p.textSize(11);
    const mitad = Math.ceil(ONDAS.length / 2);
    const col1 = ONDAS.slice(0, mitad).map((o) => `${o.tecla} ${o.nombre}`).join("   ");
    const col2 = ONDAS.slice(mitad).map((o) => `${o.tecla} ${o.nombre}`).join("   ");
    p.text(col1, x, y);
    y += 15;
    p.text(col2, x, y);
    y += 18;
    p.fill(PALETA.texto);
    p.text("Perillas: armónicos · amplitud · vel.", x, y);
    y += 14;
    p.text("s: guardar PNG", x, y);
    p.pop();
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") {
      p.saveCanvas(SLUG, "png");
      return;
    }
    const onda = ONDAS.find((o) => o.tecla === p.key);
    if (onda) {
      ondaActual = onda.id;
      grafica.changeFunction(onda.id);
    }
  };
};
