import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de
 * `Talleres2021-CC1/.../script/CC1_taller4_Movbolita_loopAnidado.js`.
 *
 * Rejilla de figuras dibujada con bucles anidados: cada celda tiene un círculo
 * blanco en trayectoria circular (cos/sin) y una elipse cuyo verde se modula con
 * ruido Perlin. El fondo no se limpia, así que el movimiento deja rastros que
 * van tejiendo una textura tipo campo.
 *
 * Conversión global → instancia: globales a clausura, API de p5 con `p.`, sin
 * `.parent`. Se conserva `Math.cos/Math.sin` del original.
 */
export const rejillaMovimiento: SketchFactory = (p: p5) => {
  let separacion = 40;
  let x = separacion;
  let y = separacion;
  let ref = 0;
  let nZ = 0;

  p.setup = () => {
    p.createCanvas(400, 400);
    p.background(0);
    separacion = 40;
    x = separacion;
    y = separacion;
    ref = 0;
    nZ = p.random(100);
    p.frameRate(30);
  };

  p.draw = () => {
    for (let j = 0; j < p.height - separacion * 1.5; j += separacion * 2) {
      for (let i = 0; i < p.width - separacion * 1.5; i += separacion * 2) {
        // Círculo blanco en trayectoria circular.
        p.noStroke();
        p.fill(255);
        p.ellipse(
          x + i + 20 * Math.cos(ref),
          y + j + 20 * Math.sin(ref),
          15,
        );

        // Elipse cuyo verde se modula con ruido Perlin.
        p.noStroke();
        p.fill(50, 255 * p.noise(nZ), 0);
        nZ += 0.05;
        p.ellipse(
          x + i - 10 * Math.cos(ref),
          y + j - 10 * Math.sin(ref),
          10,
          5,
        );

        ref += 0.01;
      }
    }
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("rejilla-movimiento", "png");
  };
};
