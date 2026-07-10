import type p5 from "p5";
import { Particle } from "../bibliotecas/particula";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `p5_works/sketches/generativoParticulas.js`.
 * Basado en el "Perlin noise flow field" de The Coding Train.
 *
 * 300 partículas que siguen un campo de flujo Perlin (recalculado cada frame),
 * dejando estelas de color que derivan en el tiempo y rebotan en los bordes.
 *
 * Reutilización (decisión: extender la biblioteca compartida): el original traía
 * su propia clase `Particle`. En su lugar se **reutiliza `bibliotecas/particula`**,
 * que se extendió con el tipo de dibujo `"estela"` y los métodos `derivaColor()`
 * (desvanecido + deriva de tono) y `rebote()` (rebote en bordes). El campo de
 * flujo se calcula inline como un arreglo de vectores (no requiere una clase
 * `Flowfield`). Se reemplaza `p5.Vector.fromAngle(a)` por
 * `createVector(cos(a), sin(a))` para no depender del constructor de p5.
 *
 * Rediseño de paleta/interacción (a diferencia del original, que creaba las
 * 300 partículas idénticas en azul plano sobre fondo blanco):
 * - Paleta propia (violeta-magenta-cian neón) sobre fondo casi negro, elegida
 *   para que el efecto de deriva de color siga leyéndose como un gradiente
 *   frío/cyberpunk en vez del azul plano original.
 * - El color de cada partícula se elige con `p.randomGaussian` centrada en el
 *   índice medio de `PALETA.colores` (el violeta profundo), así la mayoría
 *   cae cerca del centro de la paleta y menos partículas hacia los extremos
 *   cian/magenta. Se usa reflejo (no recorte/clamp directo) para no acumular
 *   partículas artificialmente en los bordes del arreglo.
 * - El tamaño real visible en modo "estela" es el grosor del trazo (4º
 *   argumento del constructor, mapeado a `this.stroke`); `size` (3er arg) no
 *   se usa en este modo de dibujo. Se hace variar ambos con una gaussiana
 *   angosta alrededor de un valor base, para que el "tamaño ligeramente
 *   distinto" pedido se note en el grosor real de la estela.
 * - `derivaColor()` (en `bibliotecas/particula.ts`) desplazaba r/g/b sin tope
 *   (0.1/-0.1 por frame): con el tiempo TODAS las partículas convergían al
 *   mismo amarillo (r,g se saturan en 255, b llega a 0), sin importar su color
 *   inicial de paleta — diluía por completo la paleta elegida en menos de un
 *   minuto. Se redujo la tasa a una décima parte (ver comentario en
 *   `particula.ts`) para que la identidad de color de cada partícula dure
 *   varios minutos antes de derivar; se conserva el efecto de deriva orgánica
 *   (no se eliminó), solo se ralentizó.
 * - Interacción de mouse (antes inexistente): el cursor actúa como
 *   atractor/repulsor continuo sobre las partículas cercanas (radio limitado),
 *   reutilizando `part.applyForce()` ya expuesto por `Particle` — sin mecanismo
 *   paralelo. Un clic invierte el modo atracción↔repulsión.
 */

/** Paleta del sketch — ajustar aquí sin tocar la lógica de dibujo. */
const PALETA = {
  fondo: "#07030f", // negro azul-violeta profundo, casi puro
  // Extremo frío (cian) → centro (violeta profundo) → extremo cálido (rosa neón).
  // El centro del arreglo es el color con más probabilidad de asignarse.
  colores: ["#22d3ee", "#3b82f6", "#7c3aed", "#c026d3", "#ec4899"],
};

/** Config de tamaño/grosor de trazo — variación pequeña alrededor de una base. */
const CONFIG_PARTICULAS = {
  grosorBase: 2.5,
  grosorDesviacion: 0.6,
  grosorMin: 1,
  grosorMax: 5,
};

/** Config de la interacción de mouse (atractor/repulsor local). */
const CONFIG_MOUSE = {
  radio: 150,
  fuerzaMax: 0.6,
};

export const generativoParticulas: SketchFactory = (p: p5) => {
  const inc = 0.1;
  const scl = 10;
  let cols = 0;
  let rows = 0;
  let zoff = 0;

  const particles: Particle[] = [];
  let flowfield: p5.Vector[] = [];

  // Vector reutilizado para la fuerza del mouse: evita crear un p5.Vector
  // nuevo por partícula en cada frame (300 partículas × 60fps).
  const fuerzaMouse = p.createVector(0, 0);
  // true = el cursor atrae a las partículas cercanas; false = las repele.
  // Se invierte con un clic (ver mousePressed).
  let atrae = true;

  /**
   * Elige un índice de `PALETA.colores` con distribución gaussiana centrada
   * en el color medio del arreglo. Si la muestra cae fuera de rango se
   * refleja (espejo) en vez de recortarla, para no acumular partículas en
   * los índices extremos.
   */
  const indiceColorGaussiano = () => {
    const maxIndice = PALETA.colores.length - 1;
    const media = maxIndice / 2;
    const desviacion = PALETA.colores.length / 6;
    let idx = p.randomGaussian(media, desviacion);
    if (idx < 0) idx = -idx;
    if (idx > maxIndice) idx = 2 * maxIndice - idx;
    idx = p.constrain(idx, 0, maxIndice);
    return Math.round(idx);
  };

  p.setup = () => {
    p.createCanvas(600, 600);
    cols = p.floor(p.width / scl);
    rows = p.floor(p.height / scl);
    flowfield = new Array(cols * rows);

    for (let i = 0; i < 300; i++) {
      const pos = p.createVector(p.random(250, 350), p.random(250, 350));
      const grosor = p.constrain(
        p.randomGaussian(CONFIG_PARTICULAS.grosorBase, CONFIG_PARTICULAS.grosorDesviacion),
        CONFIG_PARTICULAS.grosorMin,
        CONFIG_PARTICULAS.grosorMax,
      );
      const color = PALETA.colores[indiceColorGaussiano()];
      // size (3er arg) no se usa en el modo "estela"; se le pasa el mismo
      // grosor por consistencia si el modo de dibujo cambiara más adelante.
      particles[i] = new Particle(p, pos, grosor, grosor, "estela", color);
    }
    p.background(PALETA.fondo);
  };

  p.draw = () => {
    // Recalcula la posición del campo de flujo.
    let yoff = 0;
    for (let y = 0; y < rows; y++) {
      let xoff = 0;
      for (let x = 0; x < cols; x++) {
        const index = x + y * cols;
        const angle = p.noise(xoff, yoff, zoff) * p.TWO_PI * 4;
        const v = p.createVector(p.cos(angle), p.sin(angle));
        v.setMag(1);
        flowfield[index] = v;
        xoff += inc;
      }
      yoff += inc;
      zoff += 0.0001;
    }

    for (let i = 0; i < particles.length; i++) {
      const part = particles[i];
      // Índice de la celda del campo bajo la partícula (con guarda anti-undefined
      // si la posición se sale del lienzo antes de rebotar).
      const cx = p.floor(part.pos.x / scl);
      const cy = p.floor(part.pos.y / scl);
      const force = flowfield[cx + cy * cols];
      if (force) {
        part.follow(force);
      }

      // Atractor/repulsor local del mouse: solo actúa dentro de `radio`, con
      // intensidad decreciente hacia el borde del radio de influencia.
      const dx = p.mouseX - part.pos.x;
      const dy = p.mouseY - part.pos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0.01 && distSq < CONFIG_MOUSE.radio * CONFIG_MOUSE.radio) {
        const dist = p.sqrt(distSq);
        const intensidad = p.map(dist, 0, CONFIG_MOUSE.radio, CONFIG_MOUSE.fuerzaMax, 0);
        const signo = atrae ? 1 : -1;
        fuerzaMouse.set((dx / dist) * intensidad * signo, (dy / dist) * intensidad * signo);
        part.applyForce(fuerzaMouse);
      }

      part.update();
      part.derivaColor();
      part.rebote();
      part.show("estela");
      part.updateRgb();
    }
  };

  p.mousePressed = () => {
    atrae = !atrae;
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("generativo-particulas", "png");
  };
};
