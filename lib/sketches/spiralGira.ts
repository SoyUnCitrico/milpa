import type p5 from "p5";
import { Spiral } from "../bibliotecas/spiral";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `p5_works/sketches/spiralGira.js`.
 *
 * Flor animada de cuatro capas de espirales (centro, corona, semillas, pétalos)
 * que respiran: los radios y ciclos hacen ping-pong entre límites mientras los
 * offsets de ángulo rotan en sentidos contrarios. Reutiliza la biblioteca
 * `Spiral` (que a su vez reutiliza `Particle`), igual que `spiralOne`.
 *
 * Los globales del original viven como variables de clausura; se elimina el
 * `.parent('mainContainer')` (el wrapper monta el canvas) y los `keyPressed`
 * originales (estaban comentados, sólo llamaban a `saveFrames`).
 *
 * La capa `petalos` usa el nuevo tipo de dibujo `"petalo"` de
 * `Particle.show()` (ver `lib/bibliotecas/particula.ts`) en vez de `"square"`:
 * mismo mecanismo de `Spiral` (partículas rotadas a su ángulo polar), pero con
 * una forma de gota alargada que se lee como pétalo real.
 *
 * Paleta: los tonos originales (dorado/marrón/naranja quemado sobre cielo
 * pastel) ya tenían identidad cálida propia — se empujan a un duotono más
 * saturado/oscuro (atardecer ember casi negro) sin copiar la variante violeta
 * de `girasol.ts`, para que cada pieza conserve su propia identidad.
 */
/** Paleta del sketch — ajustar aquí sin tocar la lógica de dibujo. */
const PALETA = {
  fondo: "#1a0605", // antes rgba(146,182,228,1) (cielo pastel día) → atardecer ember casi negro
  centro: "#9c4816", // antes #824B27, empujado a marrón-ember más saturado
  contorno: "#120608", // antes #0e060fff, casi negro con tinte ember (fill de corona + base del contorno de pétalos)
  semillas: "#e0630f", // antes #C86D18, empujado a naranja-ember vívido
  dorado: "#ffbe3d", // antes #E7A014, empujado a ámbar-dorado más brillante (stroke de corona/semillas, fill de pétalos)
};

export const spiralGira: SketchFactory = (p: p5) => {
  const ciclos = 24.45;
  const numParticulas = 400;
  const particleSize = 3;
  const particleStroke = 0;

  const radioInterior = 0;
  const radioExterior = 100;
  const radioSteps = numParticulas;
  const particleType = "circle";

  let ang = 0;
  let ang2 = 0;
  let ang3 = 0;

  const dirAng = 0.5;
  const dirAng2 = dirAng * -3;
  const dirAng3 = dirAng * 0.275;
  let dirRadio = 1;
  let dirRadio2 = 5;
  let dirRadio3 = 1;

  let cics = ciclos / 2.985;
  let dirCics = -cics / 2000;
  let cicsPetalos = 1;
  const dirCicsPet = 0.01;

  // Contorno translúcido de los pétalos: mismo tono que `PALETA.contorno`,
  // con alfa bajo (20%, "33" en hex) para un borde sutil.
  const contornoPetalo = `${PALETA.contorno}33`;

  let centro: Spiral, corona: Spiral, semillas: Spiral, petalos: Spiral;
  // Componentes RGB del fondo, derivados una sola vez en setup (igual que
  // `Particle` deriva r/g/b de un color hex) para reutilizarlos en el
  // `background(...)` translúcido de cada frame en `draw()`.
  let fondoR = 0,
    fondoG = 0,
    fondoB = 0;

  p.setup = () => {
    p.frameRate(30);
    p.createCanvas(1080, 1080);
    p.background(PALETA.fondo);
    const fondoColor = p.color(PALETA.fondo);
    fondoR = p.red(fondoColor);
    fondoG = p.green(fondoColor);
    fondoB = p.blue(fondoColor);

    centro = new Spiral(
      p,
      numParticulas,
      ciclos,
      radioInterior,
      radioExterior,
      radioSteps,
      particleSize,
      particleStroke,
      "square",
      PALETA.centro,
    );

    corona = new Spiral(
      p,
      numParticulas / 2,
      ciclos / 2.985,
      radioExterior,
      radioExterior * 2,
      radioSteps,
      particleSize * 2.4,
      0,
      particleType,
      PALETA.contorno,
      PALETA.dorado,
    );

    semillas = new Spiral(
      p,
      numParticulas,
      ciclos / 1.185,
      radioExterior * 1.46,
      radioExterior * 2.5,
      radioSteps,
      particleSize * 2,
      0,
      "circle",
      PALETA.semillas,
      PALETA.dorado,
    );

    petalos = new Spiral(
      p,
      35,
      cicsPetalos,
      radioExterior * 4,
      radioExterior * 4,
      35,
      particleSize * 10,
      2,
      "petalo",
      PALETA.dorado,
      contornoPetalo,
    );

    p.smooth();
  };

  p.draw = () => {
    p.background(fondoR, fondoG, fondoB, 10);

    corona.update();
    centro.update();
    semillas.update();
    petalos.update();

    semillas.draw();
    corona.draw();
    centro.draw();
    petalos.draw();

    const offsetAngle2 = ang * -1;
    petalos.setOffsetAngle(ang3);
    centro.setOffsetAngle(ang2);
    corona.setOffsetAngle(ang);
    semillas.setOffsetAngle(offsetAngle2);

    centro.setRadioInt(centro.getRadioInterior() + dirRadio);
    corona.setCicles(cics);
    semillas.setRadioExt(semillas.getRadioExterior() + dirRadio2);
    semillas.setRadioInt(semillas.getRadioInterior() + dirRadio3);
    petalos.setCicles(cicsPetalos);

    ang += dirAng;
    ang2 += dirAng2;
    ang3 += dirAng3;

    cics += dirCics;
    cicsPetalos += dirCicsPet;

    if (cics >= ciclos / 2.985 || cics <= 7.8) {
      dirCics *= -1;
    }

    if (
      centro.getRadioInterior() >= radioExterior ||
      centro.getRadioInterior() <= 0
    ) {
      dirRadio *= -1;
    }

    if (
      semillas.getRadioExterior() >= p.width / 2.75 ||
      semillas.getRadioExterior() <= radioExterior * 1.3
    ) {
      dirRadio2 *= -1;
    }

    if (
      semillas.getRadioInterior() >= radioExterior * 1.5 ||
      semillas.getRadioInterior() <= -10
    ) {
      dirRadio3 *= -1;
    }
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("spiral-gira", "png");
  };
};
