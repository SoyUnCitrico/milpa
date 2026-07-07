import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/compAurea.js`.
 * Círculos en proporciones áureas (φ = 1.618) sobre las esquinas y retículas de
 * una rejilla, con un cuadrado central que rota. Loop continuo (sin noLoop).
 */
export const compAurea: SketchFactory = (p: p5) => {
  const diametroBase = 81;
  const diametroDos = diametroBase * 1.618;
  const diametroTres = diametroDos * 1.618;
  const diametroCuatro = diametroTres * 1.618;
  const diametroCinco = diametroCuatro * 1.618;
  const diametroSeis = diametroCinco * 1.618;

  let centro: p5.Vector;
  let esquinaSI: p5.Vector, esquinaSD: p5.Vector, esquinaII: p5.Vector, esquinaID: p5.Vector;
  let retSI: p5.Vector, retSD: p5.Vector, retII: p5.Vector, retID: p5.Vector;
  let angle = 0;

  p.setup = () => {
    p.createCanvas(1000, 1000);
    centro = p.createVector(p.width / 2, p.height / 2);

    esquinaSI = p.createVector(50, 50);
    esquinaSD = p.createVector(950, 50);
    esquinaII = p.createVector(50, 950);
    esquinaID = p.createVector(950, 950);

    retSI = p.createVector(350, 350);
    retSD = p.createVector(650, 350);
    retII = p.createVector(350, 650);
    retID = p.createVector(650, 650);

    p.rectMode(p.CENTER);
  };

  p.draw = () => {
    p.background(200);
    p.noStroke();
    circulosSeis();
    cuadro();
    circulosCinco();
    circulosTres();
    circulosCuatro();
    circulosDos();
    circulosUno();

    angle += 0.01;
    angle %= p.TWO_PI;
  };

  function cuadro() {
    p.push();
    p.translate(centro.x, centro.y);
    p.rotate(angle);
    p.noFill();
    p.strokeWeight(5);
    p.stroke(0, 255);
    p.rect(0, 0, (p.width * 3) / 10, (p.height * 3) / 10);
    p.pop();
  }

  function circulosUno() {
    p.push();
    p.fill(139, 19, 0, 255 * 0.8);
    p.translate(esquinaSI.x, esquinaSI.y);
    p.ellipse(0 + diametroBase / 2, 0 + diametroBase / 2, diametroBase, diametroBase);
    p.pop();
  }

  function circulosDos() {
    p.push();
    p.fill(242, 222, 208, 255 * 0.5);
    p.ellipse(retSI.x - diametroDos / 2, retSI.y - diametroDos / 2, diametroDos, diametroDos);
    p.ellipse(retSD.x + diametroDos / 2, retSD.y - diametroDos / 2, diametroDos, diametroDos);
    p.ellipse(retII.x - diametroDos / 2, retII.y + diametroDos / 2, diametroDos, diametroDos);
    p.ellipse(retID.x + diametroDos / 2, retID.y + diametroDos / 2, diametroDos, diametroDos);
    p.pop();
  }

  function circulosTres() {
    p.push();
    p.fill(199, 208, 157, 255 * 0.5);
    p.ellipse(centro.x, centro.y, diametroTres, diametroTres);
    p.pop();
  }

  function circulosCuatro() {
    p.push();
    p.fill(241, 158, 96, 255 * 0.5);
    p.ellipse(esquinaSI.x + diametroCuatro / 2, esquinaSI.y + diametroCuatro / 2, diametroCuatro, diametroCuatro);
    p.ellipse(esquinaSD.x - diametroCuatro / 2, esquinaSD.y + diametroCuatro / 2, diametroCuatro, diametroCuatro);
    p.ellipse(esquinaII.x + diametroCuatro / 2, esquinaII.y - diametroCuatro / 2, diametroCuatro, diametroCuatro);
    p.ellipse(esquinaID.x - diametroCuatro / 2, esquinaID.y - diametroCuatro / 2, diametroCuatro, diametroCuatro);
    p.pop();
  }

  function circulosCinco() {
    p.push();
    p.fill(36, 32, 226, 255 * 0.5);
    p.ellipse(esquinaSI.x + diametroCinco / 2, esquinaSI.y + diametroCinco / 2, diametroCinco, diametroCinco);
    p.ellipse(esquinaID.x - diametroCinco / 2, esquinaID.y - diametroCinco / 2, diametroCinco, diametroCinco);
    p.fill(229, 53, 35, 255 * 0.5);
    p.ellipse(esquinaSD.x - diametroCinco / 2, esquinaSD.y + diametroCinco / 2, diametroCinco, diametroCinco);
    p.ellipse(esquinaII.x + diametroCinco / 2, esquinaII.y - diametroCinco / 2, diametroCinco, diametroCinco);
    p.pop();
  }

  function circulosSeis() {
    p.push();
    p.fill(30, 152, 103, 255 * 0.64);
    p.ellipse(centro.x, centro.y, diametroSeis, diametroSeis);
    p.pop();
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("comp-aurea", "png");
  };
};
