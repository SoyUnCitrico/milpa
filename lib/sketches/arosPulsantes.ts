import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de
 * `Talleres2021-CC1/.../Ejemplos/CC1_ejemplo4_Movbolita_loopAnidado_aros.js`.
 *
 * Rediseño completo: el original era una rejilla **sin estado** — un doble
 * `for` en `draw()` que en cada paso incrementaba `size1`/`size2` de forma
 * acumulada a lo largo del propio recorrido (no realmente por posición de
 * celda), dibujando un punto blanco, un aro azul y un cuadrado rojo fijos que
 * laten al unísono.
 *
 * Ahora cada celda es un objeto `Celda` con estado propio: tamaño base
 * determinístico (ruido Perlin muestreado una sola vez en `setup()`), fase de
 * pulso y de color propias, y un contador de índice que decide si le toca la
 * animación normal o la alterna (cada 3ª celda). Esto exige el mismo cambio
 * arquitectónico que ya se aplicó en `rejillaMovimiento.ts`: pasar de un doble
 * `for` sin memoria a un arreglo de celdas creado una vez en `setup()` y
 * actualizado/dibujado en `draw()`.
 *
 * Elementos de cada celda en proporción áurea constante (φ ≈ 1.618): el
 * cuadrado es la unidad base, el aro mide `cuadrado × φ` y el punto
 * `cuadrado ÷ φ` — la relación se mantiene aunque el tamaño base y el pulso
 * varíen por celda y por frame.
 */

/**
 * Paleta base (HSB dinámico): en vez de colores fijos, el matiz de cada
 * elemento recorre el espectro de forma continua con un corrimiento de fase
 * propio por celda y por elemento (punto/aro/cuadrado), para un efecto
 * psicodélico en movimiento. Saturación y brillo sí varían dentro de un rango
 * fijo, más intensos cerca del mouse.
 */
const PALETA = {
  fondo: "#05040a", // negro con tinte violeta profundo, no negro puro
  saturacionBase: 55,
  saturacionEnergizada: 100,
  brilloBase: 55,
  brilloEnergizado: 100,
  // Separación de matiz (grados) entre punto/aro/cuadrado de una misma celda:
  // aproximación triádica para que los tres elementos nunca coincidan en tono.
  separacionMatizAro: 130,
  separacionMatizCuadrado: 250,
};

/** Rejilla, proporciones y animación. Ajustar aquí sin tocar la lógica de dibujo. */
const CONFIG_AROS = {
  cols: 7,
  rows: 7,
  cuadradoBase: 30, // lado base del cuadrado antes de variación por celda y pulso
  celda: 75, // separación entre centros de celda, px (= cuadradoBase * 2.5)
  margen: 82.5, // offset inicial para centrar la rejilla (= cuadradoBase * 2.75)
  phi: 1.6180339887498949, // proporción áurea: aro = cuadrado * phi, punto = cuadrado / phi

  // Variación de tamaño base por celda (determinística vía p.noise, calculada
  // una sola vez en setup — no cambia frame a frame).
  escalaNoise: 0.35,
  variacionTamanoMin: 0.75,
  variacionTamanoMax: 1.3,

  // Animación "normal" (2 de cada 3 celdas): pulso ping-pong suave por seno.
  amplitudPulso: 0.28,
  velocidadPulso: 0.045,

  // Animación "alterna" (cada 3ª celda, ver `cicloAlterno`): rotación continua
  // del cuadrado + un rebote elástico amortiguado (impulso tipo resorte que
  // decae en cada ciclo) en vez del pulso suave — debe notarse a simple vista
  // que no es el mismo patrón que las otras dos de cada trío.
  cicloAlterno: 3,
  velocidadRotacionAlterna: 0.05,
  velocidadBounceAlterna: 0.018,
  amplitudBounceAlterna: 0.45,

  // Énfasis de energía alrededor del mouse: más amplitud, más velocidad y más
  // saturación/brillo cerca del cursor, con caída suave (smoothstep) hasta 0
  // en el borde del radio de influencia.
  radioInfluenciaMouse: 260,
  energiaAmplitudMax: 2.0, // multiplicador de amplitud de pulso en el punto más cercano
  energiaVelocidadMax: 1.8, // multiplicador de velocidad de animación en el punto más cercano

  velocidadColor: 0.6, // grados de matiz que recorre por frame (corrimiento HSB continuo)
};

/**
 * Impulso elástico amortiguado para la animación alterna: parte de 0, oscila
 * y decae a ~0 hacia t=1 (como un resorte "plink" en vez de una curva suave),
 * visualmente distinto al pulso senoidal de las celdas normales.
 */
function reboteElastico(t: number): number {
  const decaimiento = Math.exp(-6 * t);
  return Math.sin(t * Math.PI * 3.5) * decaimiento;
}

class Celda {
  p: p5;
  x: number;
  y: number;
  esAlterna: boolean;
  tamanoBase: number;
  /** Fase propia en [0, 1): desfasa el pulso/rebote y el corrimiento de color. */
  fase: number;
  faseColorGrados: number;
  /** Ángulo de rotación acumulado; solo avanza (y se usa) en celdas alternas. */
  rotacion = 0;

  constructor(p: p5, x: number, y: number, col: number, row: number, indice: number) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.esAlterna = indice % CONFIG_AROS.cicloAlterno === CONFIG_AROS.cicloAlterno - 1;

    // Tamaño base determinístico por celda (una sola vez, no cambia por frame).
    const ruido = p.noise(col * CONFIG_AROS.escalaNoise, row * CONFIG_AROS.escalaNoise);
    this.tamanoBase = p.map(
      ruido,
      0,
      1,
      CONFIG_AROS.variacionTamanoMin,
      CONFIG_AROS.variacionTamanoMax,
    );

    this.fase = p.noise(col * CONFIG_AROS.escalaNoise + 100, row * CONFIG_AROS.escalaNoise + 100);
    this.faseColorGrados =
      p.noise(col * CONFIG_AROS.escalaNoise + 200, row * CONFIG_AROS.escalaNoise + 200) * 360;
  }

  dibujar(matizGlobal: number, energia: number, frameCount: number) {
    const p = this.p;

    const amplitud =
      CONFIG_AROS.amplitudPulso * (1 + energia * (CONFIG_AROS.energiaAmplitudMax - 1));
    const velocidad =
      CONFIG_AROS.velocidadPulso * (1 + energia * (CONFIG_AROS.energiaVelocidadMax - 1));

    let escala: number;
    let angulo = 0;

    if (this.esAlterna) {
      this.rotacion += CONFIG_AROS.velocidadRotacionAlterna * (1 + energia);
      angulo = this.rotacion;
      const ciclo =
        (frameCount * CONFIG_AROS.velocidadBounceAlterna * (1 + energia) + this.fase) % 1;
      escala =
        1 + reboteElastico(ciclo) * CONFIG_AROS.amplitudBounceAlterna * (1 + energia * 0.5);
    } else {
      escala = 1 + Math.sin(frameCount * velocidad + this.fase * Math.PI * 2) * amplitud;
    }

    const cuadradoLado = CONFIG_AROS.cuadradoBase * this.tamanoBase * escala;
    const aroDiametro = cuadradoLado * CONFIG_AROS.phi;
    const puntoDiametro = cuadradoLado / CONFIG_AROS.phi;

    const matizPunto = (matizGlobal + this.faseColorGrados) % 360;
    const matizAro = (matizPunto + PALETA.separacionMatizAro) % 360;
    const matizCuadrado = (matizPunto + PALETA.separacionMatizCuadrado) % 360;

    const saturacion = p.map(energia, 0, 1, PALETA.saturacionBase, PALETA.saturacionEnergizada);
    const brillo = p.map(energia, 0, 1, PALETA.brilloBase, PALETA.brilloEnergizado);

    p.push();
    p.translate(this.x, this.y);

    // Punto.
    p.noStroke();
    p.fill(matizPunto, saturacion, brillo);
    p.ellipse(0, 0, puntoDiametro);

    // Aro.
    p.noFill();
    p.strokeWeight(3);
    p.stroke(matizAro, saturacion, brillo);
    p.ellipse(0, 0, aroDiametro);

    // Cuadrado (rota solo en las celdas con animación alterna).
    if (angulo !== 0) p.rotate(angulo);
    p.stroke(matizCuadrado, saturacion, brillo);
    p.strokeWeight(5);
    p.rect(0, 0, cuadradoLado);

    p.pop();
  }
}

export const arosPulsantes: SketchFactory = (p: p5) => {
  const celdas: Celda[] = [];

  p.setup = () => {
    p.createCanvas(600, 600);
    p.colorMode(p.HSB, 360, 100, 100);
    p.rectMode(p.CENTER);

    celdas.length = 0;
    let indice = 0;
    for (let row = 0; row < CONFIG_AROS.rows; row++) {
      for (let col = 0; col < CONFIG_AROS.cols; col++) {
        const x = CONFIG_AROS.margen + col * CONFIG_AROS.celda;
        const y = CONFIG_AROS.margen + row * CONFIG_AROS.celda;
        celdas.push(new Celda(p, x, y, col, row, indice));
        indice++;
      }
    }
  };

  p.draw = () => {
    p.background(PALETA.fondo);

    const matizGlobal = (p.frameCount * CONFIG_AROS.velocidadColor) % 360;

    for (const celda of celdas) {
      const distancia = p.dist(p.mouseX, p.mouseY, celda.x, celda.y);
      const cercania = p.constrain(
        p.map(distancia, 0, CONFIG_AROS.radioInfluenciaMouse, 1, 0),
        0,
        1,
      );
      // Smoothstep en vez de una caída lineal: la energía se difumina hacia
      // el borde del radio de influencia sin un corte abrupto.
      const energia = cercania * cercania * (3 - 2 * cercania);

      celda.dibujar(matizGlobal, energia, p.frameCount);
    }
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("aros-pulsantes", "png");
  };
};
