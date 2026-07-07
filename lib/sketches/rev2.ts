import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/rev2.js`.
 * Variante coloreada de `revolution` en HSB con paleta verde/vino; termina con
 * `noLoop()` al completar la vuelta y remata con una franja de líneas.
 */
export const rev2: SketchFactory = (p: p5) => {
  let x: number, y: number, a: number, b: number;
  let angle = 0;
  let index = 0;
  let indexVino = 0;
  let angle2: number;
  let stepAngle: number;
  let radio: number, radioChico: number;

  let verde1: p5.Color, verde2: p5.Color;
  let vino2: p5.Color, vino3: p5.Color;

  p.setup = () => {
    p.createCanvas(1000, 1000);
    p.colorMode(p.HSB, 360, 100, 100, 100);

    verde1 = p.color(88, 22, 100);
    verde2 = p.color(75, 100, 100);

    vino2 = p.color(332, 78, 64);
    vino3 = p.color(290, 59, 31);
    p.background(vino3);

    radioChico = p.width * 0.12;
    radio = p.width * 0.45;
    stepAngle = p.TWO_PI / 360;
    angle2 = p.TWO_PI;
  };

  p.draw = () => {
    paisaje();
    actualiza();
    if (angle >= p.TWO_PI) {
      cuadrados();
      p.noLoop();
    }
  };

  function paisaje() {
    p.push();
    p.translate(p.width / 2, p.height / 2);
    x = radio * p.cos(angle2);
    y = radio * p.sin(angle2);
    a = radioChico * p.cos(angle);
    b = radioChico * p.noise(indexVino) * p.sin(angle);
    p.strokeWeight(1);
    if (angle2 <= p.PI) {
      vino2.setAlpha(p.noise(indexVino) * 30 + 10);
      p.stroke(vino2);
      p.line(a, b, x, y);
    } else {
      verde1.setAlpha(p.noise(index) * 70 + 20);
      p.stroke(verde1);
      p.line(0, 0, x, y);
    }
    p.pop();
  }

  function actualiza() {
    index += 0.01;
    indexVino += 0.001;
    angle += stepAngle;
    angle2 -= stepAngle;
  }

  function cuadrados() {
    const lado = p.width * 0.08;
    let str = 10;
    p.push();
    p.translate(p.width / 2 - 1.5 * lado, p.height / 2);
    p.rotate(p.PI * 1.75);
    for (let yy = 0; yy <= 40; yy += 2) {
      p.stroke(verde2);
      p.strokeWeight(str);
      p.line(yy * 4, 0, yy * 4, lado * 2);
      str -= 0.5;
    }
    p.pop();
  }

  p.keyTyped = () => {
    if (p.key === "s") p.saveCanvas("rev", "png");
  };
};
