import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de
 * `Talleres2021-CC1/.../script/CC1_taller4_Movbolita_loopAnidado.js`.
 *
 * Rediseño completo: el original era una rejilla **sin estado** — un doble
 * `for` en `draw()` que recalculaba un círculo blanco en trayectoria circular
 * (cos/sin) y una elipse verde modulada por ruido Perlin en cada celda, sobre
 * un fondo que nunca se limpiaba. El título "Ojos que no ven..." era un juego
 * de palabras sobre esa abstracción: círculos que "miraban" en círculos sin
 * ver nada realmente.
 *
 * Ahora la pieza dibuja ojos literales que sí ven: cada uno tiene una pupila
 * que persigue al cursor (efecto "googly eyes") y, al hacer clic, un
 * subconjunto reacciona cerrando el párpado o llorando. Esto exige estado
 * persistente por ojo (posición, tamaño, color de iris, fase de parpadeo o
 * llanto), así que la pieza pasa de un doble `for` sin memoria a un arreglo
 * de instancias de la clase `Ojo` creado una sola vez en `setup()` y
 * actualizado/dibujado en `draw()`. La clase vive en este archivo (no en
 * `bibliotecas/`) porque es específica de esta pieza — nada más la reutiliza.
 *
 * El fondo ahora se limpia cada frame (antes se acumulaba indefinidamente sin
 * que estuviera documentado como rareza intencional): con parpadeo y
 * lágrimas animados, los rastros acumulados no dejarían leer el estado de
 * cada ojo con claridad.
 *
 * Rejilla: en vez del `separacion = 40` fijo original (que no garantizaba
 * espacio entre figuras), las columnas/filas y el tamaño de celda se calculan
 * a partir del radio máximo de ojo + margen (`CONFIG_GRID`), y el canvas se
 * redimensiona a `cols × celda` / `rows × celda` exactos para llenarse por
 * completo sin encimar ojos ni dejar sobrantes.
 */

/** Paleta del sketch — ajustar aquí sin tocar la lógica de dibujo. */
const PALETA = {
  fondo: "#050a12", // negro azul-verdoso profundo, casi puro
  esclerotica: "#eafff2", // blanco con un tinte menta, no blanco puro
  pupila: "#0a0410",
  parpado: "#3d1440", // ciruela oscura: contrasta con la esclerótica al cerrar
  lagrima: "#5ad1ff",
  // Cada ojo elige uno de estos al azar como color de iris — variedad neón
  // entre ojos en vez de un iris único repetido.
  irisOpciones: ["#ff8c1a", "#a855f7", "#00e5ff", "#ff2f92", "#39ff14"],
};

/** Rejilla: `cols × rows` celdas de `celda` px, con `margen` de separación. */
const CONFIG_GRID = {
  cols: 8,
  rows: 8,
  celda: 100,
  margen: 18,
  radioMin: 26,
  radioMax: 40,
  // Variación de posición dentro de la celda para que la rejilla no se vea
  // perfectamente robótica; acotada para no romper el margen entre ojos
  // incluso si dos vecinos jitean uno hacia el otro.
  jitter: 4,
};

/** Proporciones internas del ojo y tiempos (ms) de sus animaciones. */
const CONFIG_OJOS = {
  proporcionIris: 0.56, // radioIris = radio menor del ojo * proporcionIris
  proporcionPupila: 0.42, // radioPupila = radioIris * proporcionPupila
  margenPupila: 2, // px que la pupila no puede acercarse al borde del iris
  duracionParpadeo: 450,
  jitterParpadeo: 150,
  duracionLlanto: 1400,
  jitterLlanto: 300,
  // Nº de ojos más cercanos al clic que reaccionan (ver mousePressed).
  cantidadReaccion: 12,
};

class Ojo {
  p: p5;
  x: number;
  y: number;
  radioX: number;
  radioY: number;
  radioIris: number;
  radioPupila: number;
  colorIris: string;

  estadoParpadeo: "abierto" | "parpadeando" = "abierto";
  inicioParpadeo = 0;
  duracionParpadeo = CONFIG_OJOS.duracionParpadeo;

  llorando = false;
  inicioLlanto = 0;
  duracionLlanto = CONFIG_OJOS.duracionLlanto;

  constructor(p: p5, x: number, y: number) {
    this.p = p;
    this.x = x;
    this.y = y;

    // Tamaño y forma de la esclerótica: radio base al azar dentro del rango
    // de la rejilla, con un segundo eje ligeramente distinto para que la
    // silueta no sea un círculo perfecto en todos los ojos.
    const radioBase = p.random(CONFIG_GRID.radioMin, CONFIG_GRID.radioMax);
    this.radioX = radioBase;
    this.radioY = radioBase * p.random(0.82, 1.18);

    const radioMenor = Math.min(this.radioX, this.radioY);
    this.radioIris = radioMenor * CONFIG_OJOS.proporcionIris * p.random(0.9, 1.1);
    this.radioPupila = this.radioIris * CONFIG_OJOS.proporcionPupila;
    this.colorIris = p.random(PALETA.irisOpciones) as string;
  }

  iniciarParpadeo(ahora: number) {
    this.estadoParpadeo = "parpadeando";
    this.inicioParpadeo = ahora;
    this.duracionParpadeo =
      CONFIG_OJOS.duracionParpadeo + this.p.random(-1, 1) * CONFIG_OJOS.jitterParpadeo;
  }

  iniciarLlanto(ahora: number) {
    this.llorando = true;
    this.inicioLlanto = ahora;
    this.duracionLlanto =
      CONFIG_OJOS.duracionLlanto + this.p.random(-1, 1) * CONFIG_OJOS.jitterLlanto;
  }

  /**
   * Cobertura del párpado en [0, 1]: 0 = abierto, 1 = cerrado. Curva senoidal
   * (sube y vuelve a bajar a lo largo de `duracionParpadeo`) en vez de un
   * cierre-espera-apertura en tres tramos: más simple de calcular y ya se lee
   * como un parpadeo natural.
   */
  private cobertura(ahora: number): number {
    if (this.estadoParpadeo !== "parpadeando") return 0;
    const t = (ahora - this.inicioParpadeo) / this.duracionParpadeo;
    if (t >= 1) {
      this.estadoParpadeo = "abierto";
      return 0;
    }
    return Math.sin(Math.min(Math.max(t, 0), 1) * Math.PI);
  }

  /** Progreso de la caída de la lágrima en [0, 1); `null` si no está llorando. */
  private progresoLlanto(ahora: number): number | null {
    if (!this.llorando) return null;
    const t = (ahora - this.inicioLlanto) / this.duracionLlanto;
    if (t >= 1) {
      this.llorando = false;
      return null;
    }
    return t;
  }

  /** Dibuja el ojo completo: esclerótica, iris + pupila, párpado y lágrima. */
  dibujar(ahora: number) {
    const p = this.p;
    const cobertura = this.cobertura(ahora);

    p.push();
    p.translate(this.x, this.y);

    // Recorta todo lo que sigue (esclerótica, iris, pupila, párpado) a la
    // elipse del ojo con el contexto 2D nativo: evita que el rectángulo del
    // párpado sobresalga de la silueta al cerrarse.
    const ctx = p.drawingContext as CanvasRenderingContext2D;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radioX, this.radioY, 0, 0, Math.PI * 2);
    ctx.clip();

    p.fill(PALETA.esclerotica);
    p.ellipse(0, 0, this.radioX * 2, this.radioY * 2);

    // Pupila: se desplaza dentro del iris en dirección al cursor (limitada
    // para no salirse de él), salvo que el ojo esté casi cerrado — el párpado
    // la va a tapar de todos modos, así que ni se calcula.
    if (cobertura < 0.95) {
      const dx = p.mouseX - this.x;
      const dy = p.mouseY - this.y;
      const dist = Math.hypot(dx, dy);
      const maxOffset = Math.max(0, this.radioIris - this.radioPupila - CONFIG_OJOS.margenPupila);
      const factor = dist > 0 ? Math.min(1, maxOffset / dist) : 0;
      const px = dx * factor;
      const py = dy * factor;

      p.fill(this.colorIris);
      p.circle(px, py, this.radioIris * 2);
      p.fill(PALETA.pupila);
      p.circle(px, py, this.radioPupila * 2);
    }

    // Párpado: cubre desde arriba hacia abajo según `cobertura`.
    if (cobertura > 0) {
      p.fill(PALETA.parpado);
      p.rect(-this.radioX, -this.radioY, this.radioX * 2, this.radioY * 2 * cobertura);
    }

    ctx.restore();
    p.pop();

    // Lágrima: cae fuera de la silueta del ojo, así que se dibuja después de
    // restaurar el recorte (si no, quedaría invisible bajo el clip).
    const progreso = this.progresoLlanto(ahora);
    if (progreso !== null) {
      const caida = this.radioY * 3.2 * progreso;
      const color = p.color(PALETA.lagrima);
      if (progreso > 0.8) color.setAlpha(p.map(progreso, 0.8, 1, 255, 0));
      p.push();
      p.translate(this.x, this.y);
      p.fill(color);
      p.ellipse(0, this.radioY * 0.9 + caida, this.radioX * 0.45, this.radioY * 0.7);
      p.pop();
    }
  }
}

export const rejillaMovimiento: SketchFactory = (p: p5) => {
  const ojos: Ojo[] = [];

  p.setup = () => {
    p.createCanvas(CONFIG_GRID.cols * CONFIG_GRID.celda, CONFIG_GRID.rows * CONFIG_GRID.celda);
    p.frameRate(30);

    ojos.length = 0;
    for (let row = 0; row < CONFIG_GRID.rows; row++) {
      for (let col = 0; col < CONFIG_GRID.cols; col++) {
        const cx =
          col * CONFIG_GRID.celda +
          CONFIG_GRID.celda / 2 +
          p.random(-CONFIG_GRID.jitter, CONFIG_GRID.jitter);
        const cy =
          row * CONFIG_GRID.celda +
          CONFIG_GRID.celda / 2 +
          p.random(-CONFIG_GRID.jitter, CONFIG_GRID.jitter);
        ojos.push(new Ojo(p, cx, cy));
      }
    }
  };

  p.draw = () => {
    p.background(PALETA.fondo);
    // Ningún ojo usa trazo: se sube `noStroke()` fuera del loop en vez de
    // repetirlo una vez por ojo por frame (64 llamadas redundantes).
    p.noStroke();
    const ahora = p.millis();
    for (const ojo of ojos) {
      ojo.dibujar(ahora);
    }
  };

  /**
   * Decisión de diseño: los ojos que reaccionan son los N más cercanos al
   * punto de clic (`CONFIG_OJOS.cantidadReaccion`), no un subconjunto
   * aleatorio disperso en todo el canvas — se lee como una reacción
   * localizada que se propaga desde donde tocó el usuario, más legible que
   * reacciones sin relación con el punto de interacción. Se reparten a la
   * mitad entre parpadear y llorar, alternando por cercanía.
   */
  p.mousePressed = () => {
    const ahora = p.millis();
    const cercanos = [...ojos]
      .sort(
        (a, b) =>
          p.dist(p.mouseX, p.mouseY, a.x, a.y) - p.dist(p.mouseX, p.mouseY, b.x, b.y),
      )
      .slice(0, CONFIG_OJOS.cantidadReaccion);

    cercanos.forEach((ojo, i) => {
      if (i % 2 === 0) {
        ojo.iniciarParpadeo(ahora);
      } else {
        ojo.iniciarLlanto(ahora);
      }
    });
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("rejilla-movimiento", "png");
  };
};
