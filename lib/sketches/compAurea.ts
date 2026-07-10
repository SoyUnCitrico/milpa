import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/compAurea.js`.
 *
 * Círculos translúcidos superpuestos cuyos diámetros crecen en proporción
 * áurea (φ = 1.618) anclados a las esquinas y retículas de una rejilla, con un
 * cuadrado central que rota. Loop continuo (sin noLoop).
 *
 * Rediseño (emm3):
 * - Paleta pasada a los tokens del sitio conservando la **variedad de tonos**
 *   del original para que cada capa se distinga: verde matrix como
 *   base/estructura, y violeta/ember/ámbar/orquídea/naranja re-mapeados
 *   1-a-1 desde el azul/rojo/naranja/crema/rojo-oscuro originales. Se
 *   conserva la idea de capas translúcidas superpuestas (los alfa
 *   0.5/0.64/0.8 dan el efecto de mezcla).
 * - Filtro **CRT** en postproceso (aberración cromática, scanlines, viñeta y
 *   flicker) cuya intensidad se **modula con el ángulo de giro** del cuadrado
 *   central, de modo que el efecto respira en sincronía con la rotación.
 * - Se expandió el único círculo rojo de la esquina (`circulosUno`) a una
 *   familia de **puntos de interés** sembrados alrededor del canvas, donde
 *   tanto las distancias entre ellos como sus tamaños siguen la misma razón
 *   áurea que la escala de diámetros (`diametroBase · φ^n`).
 *
 * El CRT se aplica compositando un buffer offscreen (`lienzo`) sobre el canvas
 * con `blendMode`/`tint` e imágenes pre-horneadas (scanlines y viñeta), sin
 * recorrer píxeles en JS por frame.
 */

const PHI = 1.618;

/**
 * Paleta re-tematizada a los tokens del sitio (matrix/neon) conservando la
 * **variedad de tonos** del original: cada capa mantiene su identidad de matiz
 * (verde-azulado, azul, rojo, naranja, verde pálido, crema, rojo oscuro) pero
 * saturada/oscurecida hacia el neón, de modo que las capas superpuestas se
 * distingan entre sí. El verde sigue siendo la base/estructura (cuadrado que
 * gira + disco central mayor); azul→violeta, rojo→ember, crema→lila claro son
 * los acentos que dan contraste. Los alfa replican los del original
 * (0.5 / 0.64 / 0.8) para conservar la mezcla translúcida.
 */
const PALETA = {
  fondo: "#050805", // matrix-black
  cuadro: "#00ff41", // matrix-green: borde neón del cuadrado que gira
  capaProfunda: "#00b341", // matrix-dim: disco central mayor (verde-azulado → verde base)
  capaGiroAzul: "#a855f7", // neon-violet: diagonal "fría" de la capa 5 (antes azul)
  capaGiroRojo: "#ff6a00", // neon-ember: diagonal "caliente" de la capa 5 (antes rojo)
  capaMedia: "#ffae42", // neon-amber: capa 4 (antes naranja)
  capaCentro: "#33ff77", // matrix-glow: disco central medio (antes verde pálido)
  capaReticula: "#c98bff", // neon-orchid: discos de las retículas (antes crema → lila claro)
  acentoEsquina: "#ff8c1a", // neon-orange: círculo de la esquina (antes rojo oscuro; semilla)
  acento: "#ff8c1a", // neon-orange: puntos de interés (pares)
  acentoAmbar: "#ffae42", // neon-amber: puntos de interés (impares)
  // El núcleo de cada punto usa el acento contrario (naranja↔ámbar) para
  // que siempre contraste con su propio disco.
} as const;

/**
 * Parámetros del filtro CRT. Todos los valores modulados se derivan del ángulo
 * de giro (`angle`) del cuadrado central en `draw()`, así el efecto late con la
 * rotación en vez de con el reloj.
 */
const CRT = {
  aberracionMin: 0, // desplazamiento RGB mínimo (px)
  aberracionMax: 6, // desplazamiento RGB máximo (px)
  scanEspaciado: 3, // separación entre scanlines (px)
  scanAlfaMin: 28, // alfa mínima de las scanlines (0–255)
  scanAlfaMax: 90, // alfa máxima de las scanlines
  vinetaBase: 0.55, // factor base de oscurecimiento de la viñeta (0–1)
  vinetaAmp: 0.18, // amplitud de respiración de la viñeta
  flickerBase: 6, // oscurecimiento base del flicker (alfa 0–255)
  flickerAmp: 10, // amplitud del flicker ligada al ángulo
  flickerRuido: 8, // jitter aleatorio del flicker por frame
} as const;

/** Puntos de interés: acentos sembrados en espiral áurea alrededor del centro. */
const NUM_PUNTOS = 5;

const SLUG = "comp-aurea";

interface PuntoInteres {
  x: number;
  y: number;
  d: number;
}

export const compAurea: SketchFactory = (p: p5) => {
  const diametroBase = 81;
  const diametroDos = diametroBase * PHI;
  const diametroTres = diametroDos * PHI;
  const diametroCuatro = diametroTres * PHI;
  const diametroCinco = diametroCuatro * PHI;
  const diametroSeis = diametroCinco * PHI;

  let centro: p5.Vector;
  let esquinaSI: p5.Vector, esquinaSD: p5.Vector, esquinaII: p5.Vector, esquinaID: p5.Vector;
  let retSI: p5.Vector, retSD: p5.Vector, retII: p5.Vector, retID: p5.Vector;
  let angle = 0;

  // Buffer donde se compone la pieza (sin CRT); el CRT se aplica al blitearlo.
  let lienzo: p5.Graphics;
  // Buffers pre-horneados del postproceso (se generan una sola vez en setup).
  let bufScanlines: p5.Graphics;
  let bufVineta: p5.Graphics;

  // Colores pre-construidos (con su alfa) para no re-parsear hex por frame.
  let colFondo: p5.Color;
  let colCuadro: p5.Color;
  let colProfunda: p5.Color;
  let colGiroAzul: p5.Color;
  let colGiroRojo: p5.Color;
  let colMedia: p5.Color;
  let colCentro: p5.Color;
  let colReticula: p5.Color;
  let colEsquina: p5.Color;
  let colAcento: p5.Color;
  let colAcentoAmbar: p5.Color;

  let puntosInteres: PuntoInteres[] = [];

  const conAlfa = (hex: string, alfa: number): p5.Color => {
    const c = p.color(hex);
    c.setAlpha(alfa);
    return c;
  };

  p.setup = () => {
    p.createCanvas(1000, 1000);
    p.pixelDensity(1); // canvas de 1000² con postproceso: evita el 4x en retina
    centro = p.createVector(p.width / 2, p.height / 2);

    esquinaSI = p.createVector(50, 50);
    esquinaSD = p.createVector(950, 50);
    esquinaII = p.createVector(50, 950);
    esquinaID = p.createVector(950, 950);

    retSI = p.createVector(350, 350);
    retSD = p.createVector(650, 350);
    retII = p.createVector(350, 650);
    retID = p.createVector(650, 650);

    // Buffer de composición: misma resolución que el canvas, sin retina.
    lienzo = p.createGraphics(p.width, p.height);
    lienzo.pixelDensity(1);
    lienzo.rectMode(lienzo.CENTER);

    // Colores con su alfa original (0.8 → 204, 0.64 → 163, 0.5 → 128).
    colFondo = p.color(PALETA.fondo);
    colCuadro = p.color(PALETA.cuadro);
    colProfunda = conAlfa(PALETA.capaProfunda, 163);
    colGiroAzul = conAlfa(PALETA.capaGiroAzul, 128);
    colGiroRojo = conAlfa(PALETA.capaGiroRojo, 128);
    colMedia = conAlfa(PALETA.capaMedia, 128);
    colCentro = conAlfa(PALETA.capaCentro, 128);
    colReticula = conAlfa(PALETA.capaReticula, 128);
    colEsquina = conAlfa(PALETA.acentoEsquina, 204);
    colAcento = conAlfa(PALETA.acento, 217);
    colAcentoAmbar = conAlfa(PALETA.acentoAmbar, 217);

    sembrarPuntosInteres();
    hornearScanlines();
    hornearVineta();
  };

  /**
   * Espiral áurea de acentos: partiendo del centro, cada punto se coloca al
   * ángulo áureo (~137.5°) del anterior, con el radio multiplicado por φ y el
   * diámetro dividido por φ. Así tanto la distancia al centro como el tamaño
   * siguen la misma razón áurea que la escala de diámetros de la composición.
   */
  function sembrarPuntosInteres() {
    const anguloAureo = Math.PI * (3 - Math.sqrt(5)); // ~2.399 rad = 137.5°
    puntosInteres = [];
    let ang = -Math.PI / 2;
    let radio = 55;
    let d = diametroBase / PHI; // ~50, el acento más grande queda junto al centro
    for (let i = 0; i < NUM_PUNTOS; i++) {
      puntosInteres.push({
        x: centro.x + radio * Math.cos(ang),
        y: centro.y + radio * Math.sin(ang),
        d,
      });
      ang += anguloAureo;
      radio *= PHI;
      d /= PHI;
    }
  }

  /** Textura de scanlines: 1px oscuro cada `scanEspaciado` px, alfa modulable. */
  function hornearScanlines() {
    bufScanlines = p.createGraphics(p.width, p.height);
    bufScanlines.pixelDensity(1);
    bufScanlines.clear();
    bufScanlines.stroke(0, 255);
    bufScanlines.strokeWeight(1);
    for (let y = 0; y < p.height; y += CRT.scanEspaciado) {
      bufScanlines.line(0, y + 0.5, p.width, y + 0.5);
    }
  }

  /** Viñeta: gradiente radial transparente al centro y negro en los bordes. */
  function hornearVineta() {
    bufVineta = p.createGraphics(p.width, p.height);
    bufVineta.pixelDensity(1);
    bufVineta.clear();
    const ctx = bufVineta.drawingContext as CanvasRenderingContext2D;
    const cx = p.width / 2;
    const cy = p.height / 2;
    const grad = ctx.createRadialGradient(cx, cy, p.width * 0.3, cx, cy, p.width * 0.72);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.55, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, p.width, p.height);
  }

  p.draw = () => {
    componerLienzo();
    aplicarCRT();

    angle += 0.01;
    angle %= p.TWO_PI;
  };

  /** Dibuja la composición completa (sin postproceso) en el buffer `lienzo`. */
  function componerLienzo() {
    lienzo.background(colFondo);
    lienzo.noStroke();
    circulosSeis();
    cuadro();
    circulosCinco();
    circulosTres();
    circulosCuatro();
    circulosDos();
    circulosUno();
    puntosDeInteres();
  }

  /**
   * Compone `lienzo` sobre el canvas aplicando el filtro CRT. Los cuatro
   * ingredientes (aberración, scanlines, viñeta, flicker) toman su intensidad
   * del ángulo de giro del cuadrado central, no de un reloj independiente.
   */
  function aplicarCRT() {
    const s = Math.sin(angle);
    const c = Math.cos(angle * PHI);

    // 1) Aberración cromática: se blitea el lienzo tres veces (un canal por
    //    copia) con ADD y desplazamiento horizontal ±desliz. Sobre negro puro
    //    los canales se reconstruyen donde coinciden y dejan franjas donde no.
    const desliz = p.map(s, -1, 1, CRT.aberracionMin, CRT.aberracionMax);
    p.background(0);
    p.blendMode(p.ADD);
    p.tint(255, 0, 0);
    p.image(lienzo, -desliz, 0);
    p.tint(0, 255, 0);
    p.image(lienzo, 0, 0);
    p.tint(0, 0, 255);
    p.image(lienzo, desliz, 0);
    p.blendMode(p.BLEND);
    p.noTint();

    // 2) Scanlines: la alfa de la textura respira con cos(angle·φ).
    const alfaScan = p.map(c, -1, 1, CRT.scanAlfaMin, CRT.scanAlfaMax);
    p.tint(255, alfaScan);
    p.image(bufScanlines, 0, 0);
    p.noTint();

    // 3) Viñeta: el factor de oscurecimiento oscila con sin(angle·2).
    const factorVineta = CRT.vinetaBase + CRT.vinetaAmp * Math.sin(angle * 2);
    p.tint(255, p.constrain(factorVineta, 0, 1) * 255);
    p.image(bufVineta, 0, 0);
    p.noTint();

    // 4) Flicker: oscurecimiento global ligado al ángulo más un jitter.
    const flicker =
      CRT.flickerBase +
      CRT.flickerAmp * Math.abs(Math.sin(angle * 7)) +
      p.random(0, CRT.flickerRuido);
    p.noStroke();
    p.fill(0, flicker);
    p.rect(0, 0, p.width, p.height);
  }

  function cuadro() {
    lienzo.push();
    lienzo.translate(centro.x, centro.y);
    lienzo.rotate(angle);
    lienzo.noFill();
    lienzo.strokeWeight(5);
    lienzo.stroke(colCuadro);
    lienzo.rect(0, 0, (p.width * 3) / 10, (p.height * 3) / 10);
    lienzo.pop();
  }

  function circulosUno() {
    lienzo.push();
    lienzo.fill(colEsquina);
    lienzo.translate(esquinaSI.x, esquinaSI.y);
    lienzo.ellipse(0 + diametroBase / 2, 0 + diametroBase / 2, diametroBase, diametroBase);
    lienzo.pop();
  }

  function circulosDos() {
    lienzo.push();
    lienzo.fill(colReticula);
    lienzo.ellipse(retSI.x - diametroDos / 2, retSI.y - diametroDos / 2, diametroDos, diametroDos);
    lienzo.ellipse(retSD.x + diametroDos / 2, retSD.y - diametroDos / 2, diametroDos, diametroDos);
    lienzo.ellipse(retII.x - diametroDos / 2, retII.y + diametroDos / 2, diametroDos, diametroDos);
    lienzo.ellipse(retID.x + diametroDos / 2, retID.y + diametroDos / 2, diametroDos, diametroDos);
    lienzo.pop();
  }

  function circulosTres() {
    lienzo.push();
    lienzo.fill(colCentro);
    lienzo.ellipse(centro.x, centro.y, diametroTres, diametroTres);
    lienzo.pop();
  }

  function circulosCuatro() {
    lienzo.push();
    lienzo.fill(colMedia);
    lienzo.ellipse(esquinaSI.x + diametroCuatro / 2, esquinaSI.y + diametroCuatro / 2, diametroCuatro, diametroCuatro);
    lienzo.ellipse(esquinaSD.x - diametroCuatro / 2, esquinaSD.y + diametroCuatro / 2, diametroCuatro, diametroCuatro);
    lienzo.ellipse(esquinaII.x + diametroCuatro / 2, esquinaII.y - diametroCuatro / 2, diametroCuatro, diametroCuatro);
    lienzo.ellipse(esquinaID.x - diametroCuatro / 2, esquinaID.y - diametroCuatro / 2, diametroCuatro, diametroCuatro);
    lienzo.pop();
  }

  function circulosCinco() {
    lienzo.push();
    // Diagonal "fría" (antes azul → violeta) vs. "caliente" (antes rojo → ember),
    // como en el original: SI+ID fríos, SD+II calientes.
    lienzo.fill(colGiroAzul);
    lienzo.ellipse(esquinaSI.x + diametroCinco / 2, esquinaSI.y + diametroCinco / 2, diametroCinco, diametroCinco);
    lienzo.ellipse(esquinaID.x - diametroCinco / 2, esquinaID.y - diametroCinco / 2, diametroCinco, diametroCinco);
    lienzo.fill(colGiroRojo);
    lienzo.ellipse(esquinaSD.x - diametroCinco / 2, esquinaSD.y + diametroCinco / 2, diametroCinco, diametroCinco);
    lienzo.ellipse(esquinaII.x + diametroCinco / 2, esquinaII.y - diametroCinco / 2, diametroCinco, diametroCinco);
    lienzo.pop();
  }

  function circulosSeis() {
    lienzo.push();
    lienzo.fill(colProfunda);
    lienzo.ellipse(centro.x, centro.y, diametroSeis, diametroSeis);
    lienzo.pop();
  }

  /**
   * Acentos naranja/ámbar sembrados en espiral áurea (ver
   * `sembrarPuntosInteres`). Cada punto lleva un núcleo del acento contrario
   * (naranja↔ámbar) para leerse como un foco de luz con contraste propio,
   * sin inundar la composición de naranja.
   */
  function puntosDeInteres() {
    lienzo.push();
    lienzo.noStroke();
    for (let i = 0; i < puntosInteres.length; i++) {
      const pt = puntosInteres[i];
      const esPar = i % 2 === 0;
      lienzo.fill(esPar ? colAcento : colAcentoAmbar);
      lienzo.ellipse(pt.x, pt.y, pt.d, pt.d);
      lienzo.fill(esPar ? colAcentoAmbar : colAcento);
      lienzo.ellipse(pt.x, pt.y, pt.d * 0.4, pt.d * 0.4);
    }
    lienzo.pop();
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
  };
};
