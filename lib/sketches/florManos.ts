import type p5 from "p5";
import type { SketchFactory } from "../types";
import { Spiral } from "../bibliotecas/spiral";
import { Knob } from "../bibliotecas/knob";
import { Boton, PanelEstado } from "../bibliotecas/boton";
import { RastreadorManos } from "../bibliotecas/manosMediaPipe";
import { SelectorCamara } from "../bibliotecas/camara";

/**
 * Flor generativa dirigida por las manos.
 *
 * La geometría es la misma familia de `spiralGira.ts`: cuatro capas de
 * `Spiral` (`lib/bibliotecas/spiral.ts`) superpuestas — centro, corona,
 * semillas y pétalos — colocadas en coordenadas polares, con los offsets de
 * ángulo rotando en sentidos contrarios sobre un fondo persistente que deja
 * estela. La diferencia está en de dónde salen los parámetros: donde
 * `spiralGira` hace ping-pong autónomo entre límites fijos, aquí **cada
 * parámetro lo dicta un gesto** leído por el modelo de visión de MediaPipe
 * (`lib/bibliotecas/manosMediaPipe.ts`):
 *
 *   pinza pulgar-índice  → tamaño de los pétalos
 *   dedos levantados     → número de pétalos (0–10 dedos ⇒ 5–40 pétalos)
 *   separación de manos  → apertura de la flor (radio exterior)
 *   puño abierto/cerrado → radio interior y densidad de semillas
 *   posición de la mano  → tono de los pétalos y velocidad de giro
 *
 * Sin cámara la pieza igual funciona: los mismos parámetros están expuestos
 * como `Knob`/`Boton` táctiles, y las manos simplemente los sobrescriben
 * mientras haya detección. Todos los valores se interpolan hacia su objetivo
 * (`suave()`), porque la lectura del modelo salta de frame a frame y sin
 * suavizado la flor tiembla.
 *
 * La cámara se elige con un `SelectorCamara` (`lib/bibliotecas/camara.ts`): en
 * equipos con más de una cámara, abrir "la que toque" es abrir la equivocada.
 * El botón "Buscar cámaras" pide permiso y recarga la lista con los nombres
 * reales (`enumerateDevices` los devuelve vacíos hasta que hay permiso), y
 * cambiar de cámara reabre el stream sin recargar el modelo.
 */

const SLUG = "flor-manos";

/**
 * Paleta: violeta/orquídea de flor nocturna sobre negro, con ámbar como
 * acento del corazón. No comparte tonos con el duotono ember de `spiralGira`
 * ni con el violeta de `girasol`.
 */
const PALETA = {
  fondo: "#07040c", // negro con tinte violeta
  centro: "#ffb43d", // ámbar: corazón de la flor
  corona: "#5b1f6e", // violeta profundo
  semillas: "#ff5fd2", // magenta neón
  petaloFrio: "#7b5cff", // extremo frío del tono de pétalo
  petaloCalido: "#ff6ac1", // extremo cálido del tono de pétalo
  contorno: "#0e0618", // casi negro (contorno de pétalos)
  hud: "#7fffa8", // texto/HUD (matrix-text)
  hudLinea: "#143b22", // marco del preview (matrix-line)
  hudAcento: "#00ff41", // esqueleto de manos (matrix-green)
};

const CONFIG = {
  lado: 900,
  /** Partículas por capa (las de pétalos las decide el gesto). */
  particulas: 380,
  petalosMin: 5,
  petalosMax: 40,
  tamPetaloMin: 22,
  tamPetaloMax: 90,
  aperturaMin: 90,
  aperturaMax: 230,
  /** Cuánto se acerca cada parámetro a su objetivo por frame (0–1). */
  suavizado: 0.1,
  /** Ancho del preview de cámara, esquina inferior derecha. */
  preview: 200,
};

/** Interpolación exponencial hacia un objetivo (suaviza el salto del modelo). */
function suave(actual: number, objetivo: number, factor: number): number {
  return actual + (objetivo - actual) * factor;
}

export const florManos: SketchFactory = (p: p5) => {
  const rastreador = new RastreadorManos(p);

  // --- Parámetros de la flor: `objetivo` lo fija el gesto (o el knob),
  // `actual` es el valor suavizado con el que se dibuja.
  const objetivo = {
    petalos: 12,
    tamPetalo: 46,
    apertura: 150,
    corazon: 40,
    tono: 0.5, // 0 = frío, 1 = cálido
    giro: 0.5, // multiplicador de la velocidad de rotación
    densidad: 1, // ciclos de la capa de semillas
  };
  const actual = { ...objetivo };

  // Cuántos pétalos tiene la capa construida ahora mismo: `Spiral` fija el
  // número de partículas en el constructor, así que cambiarlo obliga a
  // reconstruir esa capa (y solo esa).
  let petalosConstruidos = Math.round(objetivo.petalos);

  let usarCamara = false;
  let mostrarHud = true;
  let selectorCamara: SelectorCamara;
  let panelEstado: PanelEstado;

  let ang = 0;
  let ang2 = 0;
  let ang3 = 0;

  let centro: Spiral, corona: Spiral, semillas: Spiral, petalos: Spiral;
  let colPetalo: p5.Color;
  let fondoR = 0,
    fondoG = 0,
    fondoB = 0;

  // Contorno translúcido de los pétalos (alfa 20% = "33" en hex).
  const contornoPetalo = `${PALETA.contorno}33`;

  p.setup = () => {
    p.createCanvas(CONFIG.lado, CONFIG.lado);
    p.frameRate(30);
    p.smooth();

    const fondo = p.color(PALETA.fondo);
    fondoR = p.red(fondo);
    fondoG = p.green(fondo);
    fondoB = p.blue(fondo);
    p.background(fondo);
    colPetalo = p.color(PALETA.petaloFrio);

    centro = new Spiral(
      p,
      CONFIG.particulas,
      24.45,
      0,
      100,
      CONFIG.particulas,
      3,
      0,
      "square",
      PALETA.centro,
    );

    corona = new Spiral(
      p,
      CONFIG.particulas / 2,
      8.2,
      100,
      200,
      CONFIG.particulas,
      7,
      0,
      "circle",
      PALETA.corona,
      PALETA.centro,
    );

    semillas = new Spiral(
      p,
      CONFIG.particulas,
      20.6,
      146,
      250,
      CONFIG.particulas,
      6,
      0,
      "circle",
      PALETA.semillas,
      PALETA.centro,
    );

    petalos = construirPetalos(petalosConstruidos);

    crearControles();
  };

  p.draw = () => {
    // Fondo translúcido: las capas dejan estela en vez de borrarse.
    p.background(fondoR, fondoG, fondoB, 12);

    if (usarCamara && rastreador.activo) {
      rastreador.actualizar();
      leerGestos();
    }

    // Suavizado de todos los parámetros hacia su objetivo.
    for (const clave of Object.keys(objetivo) as (keyof typeof objetivo)[]) {
      actual[clave] = suave(actual[clave], objetivo[clave], CONFIG.suavizado);
    }

    aplicarParametros();

    semillas.update();
    corona.update();
    centro.update();
    petalos.update();

    semillas.draw();
    corona.draw();
    centro.draw();
    petalos.draw();

    // Giro: cada capa rota a su propia velocidad y en sentidos contrarios.
    const vel = 0.2 + actual.giro * 1.4;
    ang += vel;
    ang2 += vel * -3;
    ang3 += vel * 0.275;
    petalos.setOffsetAngle(ang3);
    centro.setOffsetAngle(ang2);
    corona.setOffsetAngle(ang);
    semillas.setOffsetAngle(-ang);

    if (mostrarHud) dibujarHud();
    panelEstado.actualizar(mostrarHud ? textoEstado() : "");
  };

  /** Capa de pétalos: un anillo de `n` pétalos a radio constante. */
  function construirPetalos(n: number): Spiral {
    const radio = actual.apertura * 2.4;
    return new Spiral(
      p,
      n,
      1,
      radio,
      radio,
      n,
      actual.tamPetalo,
      2,
      "petalo",
      PALETA.petaloFrio,
      contornoPetalo,
    );
  }

  /**
   * Vuelca los parámetros suavizados sobre las capas. El número de pétalos es
   * el único que no se puede ajustar en vivo: se reconstruye la capa cuando el
   * entero cambia.
   */
  function aplicarParametros() {
    const n = Math.round(actual.petalos);
    if (n !== petalosConstruidos) {
      petalosConstruidos = n;
      petalos = construirPetalos(n);
      petalos.setOffsetAngle(ang3);
    }

    const a = actual.apertura;
    centro.setRadioInt(0);
    centro.setRadioExt(a * 0.45);
    centro.setParticleSize(2 + actual.corazon * 0.04);

    corona.setRadioInt(a * 0.5);
    corona.setRadioExt(a * 0.5 + actual.corazon);
    corona.setCicles(6 + actual.densidad * 4);

    semillas.setRadioInt(a * 0.95);
    semillas.setRadioExt(a * 1.6);
    semillas.setCicles(14 + actual.densidad * 10);

    petalos.setRadioInt(a * 2.4);
    petalos.setRadioExt(a * 2.4);
    petalos.setParticleSize(actual.tamPetalo);

    // Tono de los pétalos: interpolación frío ↔ cálido. `Spiral.setColor` solo
    // guarda el string (cada `Particle` deriva sus canales al construirse), así
    // que el color en vivo se aplica sobre las partículas.
    colPetalo = p.lerpColor(
      p.color(PALETA.petaloFrio),
      p.color(PALETA.petaloCalido),
      actual.tono,
    );
    tintar(petalos, colPetalo);
  }

  /** Reescribe los canales RGB de todas las partículas de una capa. */
  function tintar(capa: Spiral, col: p5.Color) {
    const r = p.red(col);
    const g = p.green(col);
    const b = p.blue(col);
    for (const particula of capa.spiral) {
      particula.r = r;
      particula.g = g;
      particula.b = b;
    }
  }

  // --- Gestos → parámetros ---------------------------------------------------

  /**
   * Traduce la lectura de MediaPipe a los objetivos de la flor. Cada gesto
   * mapea a un parámetro y solo se aplica si su mano está en cuadro, así una
   * sola mano ya controla la pieza (con dos hay control completo).
   */
  function leerGestos() {
    const { manos, separacion } = rastreador.estado;
    if (manos.length === 0) return;

    // Dedos levantados (ambas manos) → número de pétalos.
    const dedos = manos.reduce((suma, m) => suma + m.dedos, 0);
    objetivo.petalos = p.map(
      dedos,
      0,
      manos.length * 5,
      CONFIG.petalosMin,
      CONFIG.petalosMax,
      true,
    );

    // Pinza pulgar-índice de la primera mano → tamaño de pétalo.
    objetivo.tamPetalo = p.map(
      manos[0].pinza,
      0.05,
      0.9,
      CONFIG.tamPetaloMin,
      CONFIG.tamPetaloMax,
      true,
    );

    // Apertura de la flor: con dos manos, la distancia entre ellas; con una,
    // qué tan extendida está.
    const aperturaGesto = separacion ?? manos[0].apertura * 0.7;
    objetivo.apertura = p.map(
      aperturaGesto,
      0.1,
      0.75,
      CONFIG.aperturaMin,
      CONFIG.aperturaMax,
      true,
    );

    // Puño cerrado ↔ mano abierta → corazón y densidad de semillas.
    const apertura =
      manos.reduce((suma, m) => suma + m.apertura, 0) / manos.length;
    objetivo.corazon = p.map(apertura, 0, 1, 10, 110, true);
    objetivo.densidad = p.map(apertura, 0, 1, 0.2, 2.4, true);
    if (manos.every((m) => m.puno)) objetivo.densidad = 0.15;

    // Posición de la mano en cuadro → tono (X) y velocidad de giro (Y).
    objetivo.tono = p.constrain(manos[0].centro.x, 0, 1);
    objetivo.giro = p.constrain(1 - manos[0].centro.y, 0, 1);
  }

  // --- Controles táctiles ----------------------------------------------------

  function crearControles() {
    new Knob(p, {
      etiqueta: "Pétalos",
      min: CONFIG.petalosMin,
      max: CONFIG.petalosMax,
      valor: objetivo.petalos,
      paso: 1,
      onChange: (v) => {
        objetivo.petalos = v;
      },
    }).position(12, 12);

    new Knob(p, {
      etiqueta: "Tamaño",
      min: CONFIG.tamPetaloMin,
      max: CONFIG.tamPetaloMax,
      valor: objetivo.tamPetalo,
      paso: 1,
      onChange: (v) => {
        objetivo.tamPetalo = v;
      },
    }).position(76, 12);

    new Knob(p, {
      etiqueta: "Apertura",
      min: CONFIG.aperturaMin,
      max: CONFIG.aperturaMax,
      valor: objetivo.apertura,
      paso: 1,
      onChange: (v) => {
        objetivo.apertura = v;
      },
    }).position(140, 12);

    new Knob(p, {
      etiqueta: "Tono",
      min: 0,
      max: 1,
      valor: objetivo.tono,
      paso: 0.01,
      onChange: (v) => {
        objetivo.tono = v;
      },
    }).position(204, 12);

    new Knob(p, {
      etiqueta: "Giro",
      min: 0,
      max: 1,
      valor: objetivo.giro,
      paso: 0.01,
      onChange: (v) => {
        objetivo.giro = v;
      },
    }).position(268, 12);

    // Menú de cámaras: los `label` de `enumerateDevices()` llegan vacíos hasta
    // que hay permiso, por eso el selector trae su propio botón "Buscar".
    // Cambiar de cámara con el rastreo encendido lo reabre en caliente.
    selectorCamara = new SelectorCamara(p, {
      ancho: 220,
      onCambio: (deviceId) => {
        if (usarCamara) void rastreador.iniciar(deviceId);
      },
    });
    selectorCamara.position(336, 12);

    new Boton(p, {
      etiqueta: "Cámara",
      alternar: true,
      acento: "naranja",
      onPress: (activo) => {
        usarCamara = activo;
        if (activo) void rastreador.iniciar(selectorCamara.valor());
        else rastreador.detener();
      },
    }).position(572, 24);

    new Boton(p, {
      etiqueta: "HUD",
      alternar: true,
      activo: true,
      onPress: (activo) => {
        mostrarHud = activo;
      },
    }).position(688, 24);

    new Boton(p, {
      etiqueta: "Guardar",
      onPress: () => p.saveCanvas(SLUG, "png"),
    }).position(776, 24);

    // El estado va en un panel DOM y no con `p.text`: el fondo de la pieza es
    // translúcido a propósito (deja estela), así que el texto dibujado sobre el
    // canvas nunca se borra y se sobreimprime hasta volverse ilegible.
    panelEstado = new PanelEstado(p);
    panelEstado.position(12, CONFIG.lado - 34);
  }

  // --- HUD: preview de cámara + lectura de gestos ----------------------------

  function dibujarHud() {
    if (!usarCamara) return;
    const w = CONFIG.preview;
    rastreador.dibujarPreview(p.width - w - 16, p.height - w * 0.75 - 16, w, {
      linea: PALETA.hudAcento,
      punto: PALETA.hud,
      marco: PALETA.hudLinea,
    });
  }

  function textoEstado(): string {
    if (!usarCamara) return "cámara: apagada — controles manuales";
    switch (rastreador.fase) {
      case "cargando":
        return "cámara: cargando modelo…";
      case "sin-permiso":
        return "cámara: permiso denegado — se usan los controles";
      case "error":
        return `cámara: error — ${rastreador.mensaje}`;
      case "activo": {
        const { manos, separacion } = rastreador.estado;
        if (manos.length === 0) return "manos: — (mostrá las manos a la cámara)";
        const dedos = manos.reduce((s, m) => s + m.dedos, 0);
        const sep = separacion === null ? "—" : separacion.toFixed(2);
        return `manos: ${manos.length}  dedos: ${dedos}  pinza: ${manos[0].pinza.toFixed(
          2,
        )}  separación: ${sep}  pétalos: ${petalosConstruidos}`;
      }
      default:
        return "cámara: apagada";
    }
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
    if (p.key === "h" || p.key === "H") mostrarHud = !mostrarHud;
  };
};
