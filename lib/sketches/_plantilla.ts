import type p5 from "p5";
import type { SketchFactory } from "../types";
import { Knob } from "../bibliotecas/knob";
import { Boton } from "../bibliotecas/boton";
// import { onRemove } from "../bibliotecas/cleanup"; // solo piezas con audio

/**
 * PLANTILLA de pieza nueva para la galería. **No está registrada** en
 * `lib/sketches/index.ts` — se copia a `lib/sketches/<nombre>.ts`, se renombra
 * la constante exportada y se llenan las secciones marcadas con `TODO`.
 *
 * Estructura común de todos los sketches de la galería (ver `revolution.ts`,
 * `trayectorias.ts`, `terrenoRuido.ts` como referencias reales):
 *
 *   1. Docblock arriba: qué hace la pieza, de qué original viene (si aplica) y
 *      qué decisiones visuales/algorítmicas la definen.
 *   2. `SLUG` — mismo string que `meta.slug` en `index.ts`; se usa en
 *      `saveCanvas`.
 *   3. `PALETA` — todos los colores literales del archivo, con claves
 *      descriptivas en español. Ningún hex suelto más abajo.
 *   4. `CONFIG` — números que se quieran tocar sin leer la lógica.
 *   5. La factory: estado en clausura, `p.setup`, `p.draw`, subrutinas de
 *      dibujo con nombre ("una figura = una función"), manejadores al final.
 *
 * Reglas que la galería asume y conviene no romper:
 * - Modo instancia: toda la API de p5 va prefijada con `p.`.
 * - Los controles son `Knob` (`lib/bibliotecas/knob.ts`) y `Boton`
 *   (`lib/bibliotecas/boton.ts`): ambos funcionan con dedo y con mouse. No usar
 *   `p.createSlider` ni `p.createButton` crudos.
 * - Toda interacción de mouse debe tener equivalente táctil; nada exclusivo de
 *   hover ni de clic derecho.
 * - `s`/`S` siempre guarda el canvas.
 */

const SLUG = "plantilla"; // TODO: mismo slug que en index.ts

/** Paleta de la pieza. TODO: ajustar tonos manteniendo la estética cyberpunk. */
const PALETA = {
  fondo: "#050805", // matrix-black
  estructura: "#00ff41", // verde neón: base / retícula / texto
  acento: "#ff8c1a", // naranja: puntual, foco de la composición
  secundario: "#00e5ff", // cian: segunda capa
} as const;

/** Parámetros ajustables de la composición. */
const CONFIG = {
  ancho: 800,
  alto: 800,
  /** Cuántos elementos dibuja la capa principal. */
  elementos: 90,
  /** Avance del ruido Perlin por frame. */
  pasoRuido: 0.004,
};

export const plantilla: SketchFactory = (p: p5) => {
  // --- Estado en clausura (lo que en el sketch legacy eran globales) ---
  let ns = 0; // semilla móvil del ruido
  let velocidad = 1; // controlado por knob
  let acumular = false; // controlado por botón (rastro vs. limpiar)
  let colEstructura: p5.Color;
  let colAcento: p5.Color;

  // Piezas con audio (Tone.js inyectado como 3er parámetro de la factory):
  //   onRemove(p, () => { nodo.dispose(); });
  // llamado una sola vez aquí, antes de p.setup.

  p.setup = () => {
    p.createCanvas(CONFIG.ancho, CONFIG.alto);
    p.colorMode(p.RGB);
    colEstructura = p.color(PALETA.estructura);
    colAcento = p.color(PALETA.acento);
    p.background(PALETA.fondo);
    ns = p.random(1000);

    crearControles();
  };

  p.draw = () => {
    // Con `acumular` el fondo se pinta translúcido y queda estela.
    if (acumular) {
      const fondo = p.color(PALETA.fondo);
      fondo.setAlpha(24);
      p.background(fondo);
    } else {
      p.background(PALETA.fondo);
    }

    capaPrincipal();
    capaAcento();

    ns += CONFIG.pasoRuido * velocidad;
  };

  // --- Controles táctiles ---------------------------------------------------
  // Knobs y botones se posicionan en coordenadas del canvas; `P5Sketch.tsx`
  // escala canvas y DOM juntos, así que quedan alineados en cualquier ancho.
  // Dejar los controles apilados desde una esquina, sin tapar el centro.

  function crearControles() {
    new Knob(p, {
      etiqueta: "Velocidad",
      min: 0,
      max: 4,
      valor: velocidad,
      paso: 0.05,
      onChange: (v) => {
        velocidad = v;
      },
    }).position(12, 12);

    new Boton(p, {
      etiqueta: "Rastro",
      alternar: true,
      activo: acumular,
      acento: "naranja",
      onPress: (activo) => {
        acumular = activo;
      },
    }).position(76, 24);

    new Boton(p, {
      etiqueta: "Reiniciar",
      onPress: () => reiniciar(),
    }).position(190, 24);
  }

  function reiniciar() {
    ns = p.random(1000);
    p.background(PALETA.fondo);
  }

  // --- Subrutinas de dibujo ("una figura = una función") --------------------

  /** TODO: capa principal de la composición. */
  function capaPrincipal() {
    p.push();
    p.translate(p.width / 2, p.height / 2);
    p.noFill();
    p.stroke(colEstructura);
    p.strokeWeight(1);
    p.beginShape();
    for (let i = 0; i <= CONFIG.elementos; i++) {
      const ang = (i / CONFIG.elementos) * p.TWO_PI;
      const r = p.map(
        p.noise(p.cos(ang) + 1, p.sin(ang) + 1, ns),
        0,
        1,
        p.width * 0.18,
        p.width * 0.36,
      );
      p.vertex(r * p.cos(ang), r * p.sin(ang));
    }
    p.endShape(p.CLOSE);
    p.pop();
  }

  /** TODO: acento naranja, puntual (no inundar de naranja). */
  function capaAcento() {
    const t = p.noise(ns * 2) * p.TWO_PI * 2;
    p.push();
    p.translate(p.width / 2, p.height / 2);
    p.noStroke();
    p.fill(colAcento);
    p.circle(p.width * 0.3 * p.cos(t), p.width * 0.3 * p.sin(t), 10);
    p.pop();
  }

  // --- Manejadores ----------------------------------------------------------

  // p5 mapea el toque de un dedo a los eventos de mouse: `mousePressed` cubre
  // mouse y touch sin código extra.
  p.mousePressed = () => {
    // TODO: interacción por toque sobre el canvas (o borrar si no aplica).
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
    // TODO: teclas propias — cada una debe tener también un control táctil
    // equivalente (Knob o Boton) para que la pieza sea usable en móvil.
  };
};
