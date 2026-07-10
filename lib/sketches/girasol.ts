import type p5 from "p5";
import { Spiral } from "../bibliotecas/spiral";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `p5_works/sketches/girasol.js`.
 *
 * Girasol estático compuesto por cuatro espirales de partículas (centro, dos
 * coronas de semillas y los pétalos) dibujadas una sola vez sobre un cielo azul.
 *
 * Reescritura clave: el original armaba cada espiral con una función local
 * `setSpiral(...)` que instanciaba `Particle`s a mano. Aquí se **reutiliza la
 * biblioteca `Spiral`** (misma colocación polar), evitando duplicar esa lógica.
 * Diferencia menor respecto al original: `Spiral` rota cada partícula por su
 * ángulo polar (los cuadrados quedan orientados), mientras el `.js` original
 * pasaba el ángulo por error como color de trazo y dejaba la rotación en 0
 * (ver translation_p5_works.md). La animación estaba comentada en el original,
 * así que la pieza se detiene con `noLoop()` tras el primer frame.
 *
 * Paleta reestilizada a un duotono cyberpunk (noche violeta + neón naranja/
 * ámbar), manteniendo la identidad cálida del girasol original.
 */
/** Paleta del sketch — ajustar aquí sin tocar la lógica de dibujo. */
const PALETA = {
  cielo: "#150826", // antes #92B6E4 (cielo día pastel) → noche synthwave violeta
  centro: "#b8551c", // antes #824B27
  semillas: "#1c0a29", // antes #0E060F, ahora violeta-negro coherente con el cielo
  corona: "#ff8c1a", // antes #C86D18, empujado a neon-orange
  petalos: "#ffae42", // antes #E7A014, empujado a neon-amber
};

export const girasol: SketchFactory = (p: p5) => {
  const numParticulas1 = 400;
  const numParticulas2 = 100;
  const numParticulas3 = 800;
  const numParticulas4 = 25;

  let centro: Spiral, semillas: Spiral, corona: Spiral, petalos: Spiral;

  p.setup = () => {
    p.createCanvas(1254, 1254);
    p.background(PALETA.cielo);

    // setSpiral(ciclos, radioInt, radioExt, stepsRadio, total, size, stroke, type, color)
    //   → new Spiral(p, total, ciclos, radioInt, radioExt, stepsRadio, size, stroke, type, color)
    centro = new Spiral(
      p,
      numParticulas1,
      9.01,
      0,
      252,
      252 * 3.1,
      4,
      0,
      "square",
      PALETA.centro,
    );

    semillas = new Spiral(
      p,
      numParticulas2,
      3.115,
      125,
      364,
      (368 - 252) * 4.2,
      10,
      1,
      "circle",
      PALETA.semillas,
    );

    corona = new Spiral(
      p,
      numParticulas3,
      32.3,
      170,
      700,
      532 * 8,
      4,
      2,
      "circle",
      PALETA.corona,
    );

    petalos = new Spiral(p, numParticulas4, 3, 400, 450, 8, 40, 5, "square", PALETA.petalos);
  };

  p.draw = () => {
    centro.draw();
    semillas.draw();
    corona.draw();
    petalos.draw();
    p.noLoop();
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("girasol", "png");
  };
};
