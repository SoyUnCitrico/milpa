import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `p5_works/sketches/generativo.js`.
 *
 * Composición generativa autónoma: un patrón aleatorio de líneas ("maze") que
 * recorre el lienzo acumulándose, una cuadrícula de elipses ("grid") y un
 * cuadrado central que gira ("spin"). Pieza sin dependencias de bibliotecas.
 *
 * Se conservan las rarezas del original: `draw()` no limpia el fondo (las líneas
 * se acumulan) y `grid()` aplica `rotate(PI)` sin `push()/pop()`, por lo que la
 * matriz de transformación va girando de forma acumulada. Las subrutinas en
 * español (`maze`, `grid`, `spin`) se mantienen como funciones internas que
 * cierran sobre `p`.
 */
export const generativo: SketchFactory = (p: p5) => {
  let x = 0;
  let y = 0;
  const gap = 20;
  let deg = 0;
  const colorFondo = "#362C28";
  const color1 = "#F3C969";
  let color2 = color1;
  const color3 = "#D4FCC3";
  const color4 = "#EDFF86";

  // Cambia el color de líneas y formas a cian mientras se mantiene el clic.
  p.mousePressed = () => {
    color2 = color3;
  };

  // Al soltar el clic, vuelve al color original.
  p.mouseReleased = () => {
    color2 = color1;
  };

  function maze() {
    // Crea un patrón aleatorio de líneas.
    p.stroke(color2);
    p.strokeWeight(2);
    if (p.random(2) < 0.5) {
      p.line(x, y, x + gap, y + gap);
    } else {
      p.line(x, y + gap, x + gap, y);
    }

    x = x + 10;
    if (x > p.width) {
      x = 0;
      y = y + gap;
    }
  }

  function grid() {
    // Crea una cuadrícula de elipses.
    for (let i = 0; i < p.windowWidth; i += 45) {
      for (let j = 0; j < p.windowHeight; j += 45) {
        p.noStroke();
        p.fill(color4);
        p.rotate(p.PI);
        p.ellipse(i, j, 20, 10);
      }
    }
  }

  function spin() {
    // Crea un cuadrado a la mitad del canvas que rota.
    p.push();
    p.scale(1);
    p.translate(p.width / 2, p.height / 2);
    p.rotate(p.radians(deg));
    deg++;
    p.fill(color2);
    p.rect(0, 0, 100, 100);
    p.pop();
  }

  p.setup = () => {
    p.createCanvas(600, 600);
    p.background(colorFondo);
    p.frameRate(60);
  };

  p.draw = () => {
    spin();
    maze();
    grid();
  };

  p.keyPressed = () => {
    // Guarda el canvas como PNG.
    if (p.key === "s" || p.key === "S") p.saveCanvas("generativo", "png");
    if (p.key === "f") {
      p.saveCanvas("", "png");
    }
  };
};
