import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de
 * `Talleres2021-CC1/.../Ejemplos/CC1_ejemplo4_Movbolita_loopAnidado_aros.js`.
 *
 * Rejilla de figuras dibujadas con bucles anidados: en cada celda un punto
 * blanco, un aro azul y un cuadrado rojo que laten al unísono. Los tamaños
 * (`size1`, `size2`) hacen ping-pong con `aumento`, produciendo el pulso.
 *
 * Conversión global → instancia: globales a clausura, API de p5 con `p.`, sin
 * `.parent`.
 */
export const arosPulsantes: SketchFactory = (p: p5) => {
  const diametro = 30;
  const xInicial = diametro * 2.75;
  const yInicial = diametro * 2.75;
  let size1 = 0;
  let size2 = 0;
  let aumento = 0.075;

  p.setup = () => {
    p.createCanvas(600, 600);
    p.background(220);
    p.rectMode(p.CENTER);
    size1 = 0;
    size2 = 0;
    aumento = 0.075;
  };

  p.draw = () => {
    p.background(10);

    // Recorre el eje vertical.
    for (let j = 0; j < diametro * 16; j += diametro * 2.5) {
      // Recorre el eje horizontal.
      for (let i = 0; i < diametro * 16; i += diametro * 2.5) {
        // Punto blanco pequeño.
        p.fill(255);
        p.noStroke();
        p.ellipse(xInicial + i, yInicial + j, 10);
        // Aro azul.
        p.noFill();
        p.strokeWeight(3);
        p.stroke(0, 120, 255);
        p.ellipse(xInicial + i, yInicial + j, diametro * 2 + size1);
        // Cuadrado rojo.
        p.stroke(255, 0, 0);
        p.strokeWeight(5);
        p.rect(xInicial + i, yInicial + j, diametro + size2);

        size1 += aumento;
      }
      size2 += aumento;
    }

    // Cambia la dirección del pulso al salir del rango.
    if (size2 > 30 || size2 < 0) {
      aumento *= -1;
    }
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("aros-pulsantes", "png");
  };
};
