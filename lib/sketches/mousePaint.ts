import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de
 * `Talleres2021-CC1/.../Ejemplos/CC1_ejemplo3_mousePaint.js`.
 *
 * Herramienta de pintura: el lienzo nunca se limpia (acumula); presionar dibuja
 * un círculo blanco, arrastrar pinta elipses cuyo tono recorre el espectro HSB,
 * soltar deja un punto, y mantener presionado traza cuadrados que rotan.
 *
 * Conversión global → instancia: globales a clausura, API de p5 prefijada con
 * `p.`, y se elimina el `.parent("sketch-container")` (lo monta el wrapper).
 */
export const mousePaint: SketchFactory = (p: p5) => {
  let hueZ = 0;
  let angCuadrado = 0;

  p.setup = () => {
    p.createCanvas(500, 500);
    p.background(0);
    p.colorMode(p.HSB);
    hueZ = 0;
    angCuadrado = 0;
  };

  p.draw = () => {
    if (p.mouseIsPressed) {
      p.push();
      p.rectMode(p.CENTER);
      p.strokeWeight(2);
      p.stroke(200, 20, 220);
      p.noFill();
      p.translate(p.mouseX, p.mouseY);
      p.rotate(angCuadrado);
      p.rect(0, 0, 10);
      p.pop();
      angCuadrado += 0.05;
    }
  };

  // Al presionar algún botón del mouse.
  p.mousePressed = () => {
    p.fill(255);
    p.noStroke();
    p.ellipse(p.mouseX, p.mouseY, 50);
  };

  // Al soltar el mouse.
  p.mouseReleased = () => {
    p.stroke(120, 10, 255);
    p.strokeWeight(5);
    p.point(p.mouseX, p.mouseY);
  };

  p.mouseDragged = () => {
    p.push();
    p.noStroke();
    p.fill(hueZ, 360, 360);
    p.ellipse(p.mouseX, p.mouseY, 30);
    hueZ += 2;
    if (hueZ > 360) {
      // Reinicio de la variable de color al llegar a 360.
      hueZ = 0;
    }
    p.pop();
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("mouse-paint", "png");
  };
};
