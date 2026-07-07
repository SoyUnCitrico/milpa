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
 */
export const generativoParticulas: SketchFactory = (p: p5) => {
  const inc = 0.1;
  const scl = 10;
  let cols = 0;
  let rows = 0;
  let zoff = 0;

  const particles: Particle[] = [];
  let flowfield: p5.Vector[] = [];

  p.setup = () => {
    p.createCanvas(600, 600);
    cols = p.floor(p.width / scl);
    rows = p.floor(p.height / scl);
    flowfield = new Array(cols * rows);

    for (let i = 0; i < 300; i++) {
      const pos = p.createVector(p.random(250, 350), p.random(250, 350));
      // size no se usa en la estela; el 4º arg (stroke) es el grosor del trazo.
      particles[i] = new Particle(p, pos, 5, p.random(1, 5), "estela", "#0000ff");
    }
    p.background(255);
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
      part.update();
      part.derivaColor();
      part.rebote();
      part.show("estela");
      part.updateRgb();
    }
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("generativo-particulas", "png");
  };
};
