import type p5 from "p5";
import { Spiral } from "../bibliotecas/spiral";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `p5_works/sketches/spiralOne.js`.
 *
 * Los globales del archivo original viven como variables de clausura dentro de
 * la factory; los callbacks `setup`/`draw`/`keyPressed` se asignan sobre `p`.
 * Se elimina el `.parent('mainContainer')` original: el wrapper monta el canvas
 * pasando el nodo a `new p5(factory, node)`.
 */
export const spiralOne: SketchFactory = (p: p5) => {
  const ciclos = 6;
  const numParticulas = 200;
  const particleSize = 5;

  let radioInterior = 10;
  let radioExterior = 150;
  const radioSteps = radioExterior * 0.95;
  const particleType = "circle";

  let ang = 0;
  let ang2 = 0;

  const dirAng = 1;
  const dirAng2 = -2;
  let dirRadio = 1;
  let dirRadio2 = 2;

  let cics = 1;
  let dirCics = 0.0075;

  let rueda: Spiral, ruedita: Spiral, ruedota: Spiral;

  const colorS = "#f2542d6f";
  const color1 = "#127475";
  const color2 = "#F5DFBB";
  const color3 = "#0E9594";
  const colorFondo = "rgba(28, 14, 14, 1)";

  p.setup = () => {
    p.frameRate(30);
    p.createCanvas(600, 600);
    p.background(colorFondo);

    ruedita = new Spiral(
      p,
      numParticulas * 2,
      ciclos * 2,
      2,
      radioExterior / 4,
      radioSteps,
      particleSize / 1,
      1,
      particleType,
      color1,
      colorS,
    );

    rueda = new Spiral(
      p,
      numParticulas,
      ciclos,
      radioInterior * 10,
      radioExterior,
      radioSteps,
      particleSize,
      0,
      particleType,
      color2,
      colorS,
    );

    ruedota = new Spiral(
      p,
      numParticulas * 1.25,
      ciclos,
      radioInterior * 17,
      radioExterior * 1.75,
      radioSteps,
      particleSize * 3,
      0,
      "square",
      color3,
      colorS,
    );
    p.smooth();
  };

  p.draw = () => {
    p.background(28, 14, 14, 28);

    rueda.update();
    ruedita.update();
    ruedota.update();

    ruedota.draw();
    rueda.draw();
    ruedita.draw();

    const offsetAngle2 = ang * -1;
    ruedita.setOffsetAngle(ang2);
    rueda.setOffsetAngle(ang);
    ruedota.setOffsetAngle(offsetAngle2);

    ruedita.setRadioInt(radioInterior);
    rueda.setCicles(cics);
    ruedota.setRadioExt(radioExterior);
    ruedota.setRadioInt(radioInterior);

    ang += dirAng;
    ang2 += dirAng2;

    cics += dirCics;

    if (cics >= 3.5 || radioInterior <= 0.15) {
      dirCics *= -1;
    }

    radioExterior += dirRadio2;
    radioInterior += dirRadio;

    if (radioInterior >= p.width / 4.2 || radioInterior <= 0) {
      dirRadio *= -1;
    }

    if (radioExterior >= p.width / 2 || radioExterior <= p.width / 4) {
      dirRadio2 *= -1;
    }
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("spiral-one", "png");
  };
};
