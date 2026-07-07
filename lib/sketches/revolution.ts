import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/revolution.js`.
 *
 * Pieza que termina en un frame final: cuando `angle >= TWO_PI` dibuja
 * `cuadrados()` y llama `p.noLoop()`. Los globales viven como clausura y las
 * subrutinas en español (`paisaje`, `actualiza`, `cuadrados`) cierran sobre `p`.
 */
export const revolution: SketchFactory = (p: p5) => {
  let x: number, y: number, a: number, b: number;
  let angle = 0;
  let index = 0;
  let angle2: number;
  let stepAngle: number;
  let radio: number, radioChico: number;

  p.setup = () => {
    p.createCanvas(500, 500);
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.background(168, 98, 25);
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
    b = radioChico * p.noise(index) * p.sin(angle);
    p.strokeWeight(1);
    if (angle2 <= p.PI) {
      p.stroke(173, 80, 94, p.noise(index) * 60);
      p.line(a, b, x, y);
    } else {
      p.stroke(120, p.noise(index) * 10 + 10, p.random(90, 95), p.noise(index) * 80 + 10);
      p.line(0, 0, x, y);
    }
    p.pop();
  }

  function actualiza() {
    index += 0.0025;
    angle += stepAngle;
    angle2 -= stepAngle;
  }

  function cuadrados() {
    const lado = p.width * 0.07;
    p.push();
    p.translate(p.width / 2 - lado / 2, p.height / 2 - lado / 2);
    let str = 10;
    for (let yy = 0; yy < 10; yy++) {
      p.stroke(255);
      p.strokeWeight(str);
      p.line(0, yy, lado, yy * 10);
      str -= 1;
    }
    p.pop();
  }

  p.keyTyped = () => {
    if (p.key === "s") {
      p.saveCanvas("rev", "png");
    }
  };
};
