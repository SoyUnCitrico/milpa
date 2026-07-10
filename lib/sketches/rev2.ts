import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Paleta en HSB (360, 100, 100, 100) — el colorMode nativo del sketch.
 * Identidad verde/vino conservada, re-mapeada hacia los tonos del sitio sin
 * copiar tokens literalmente: la mitad fría corre el verde-amarillo original
 * al verde matrix pálido, la mitad cálida mantiene el matiz vino pero más
 * saturado sobre un fondo empujado a casi negro. El remate salta del
 * chartreuse al verde neón para leerse como acento.
 */
const PALETA = {
  fondo: [295, 68, 13] as [number, number, number], // antes (290, 59, 31): mismo matiz vino-violeta, casi negro
  vino: [332, 88, 78] as [number, number, number], // antes (332, 78, 64): mismo matiz, más saturado/brillante
  verde: [137, 40, 100] as [number, number, number], // antes (88, 22, 100): corrido al verde matrix pálido
  remate: [135, 100, 100] as [number, number, number], // antes (75, 100, 100): chartreuse → verde neón
};

/**
 * Port en modo instancia de `creativeCode/rev2.js`.
 *
 * Variante de la familia "Revolución" (ver `algorithms.md`): dos ángulos
 * contrarrotantes tejen líneas con opacidad y grosor modulados por ruido
 * Perlin, acumuladas sobre fondo persistente. Mitad vino (línea entre órbita
 * chica deformada y órbita grande) y mitad verde (línea desde el centro);
 * termina con `noLoop()` al completar la vuelta y remata con una franja de
 * líneas rotada (`cuadrados()`).
 */
export const rev2: SketchFactory = (p: p5) => {
  let x: number, y: number, a: number, b: number;
  let angle = 0;
  let index = 0;
  let indexVino = 0;
  let angle2: number;
  let stepAngle: number;
  let radio: number, radioChico: number;

  p.setup = () => {
    p.createCanvas(1000, 1000);
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.background(...PALETA.fondo);

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
    const ruidoVino = p.noise(indexVino);
    const ruidoVerde = p.noise(index);
    x = radio * p.cos(angle2);
    y = radio * p.sin(angle2);
    a = radioChico * p.cos(angle);
    b = radioChico * ruidoVino * p.sin(angle);
    if (angle2 <= p.PI) {
      // El ruido se expone también como grosor del trazo (antes fijo en 1).
      p.strokeWeight(0.4 + ruidoVino * 1.6);
      p.stroke(...PALETA.vino, ruidoVino * 30 + 10);
      p.line(a, b, x, y);
    } else {
      p.strokeWeight(0.4 + ruidoVerde * 1.4);
      p.stroke(...PALETA.verde, ruidoVerde * 70 + 20);
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
    p.stroke(...PALETA.remate);
    for (let yy = 0; yy <= 40; yy += 2) {
      p.strokeWeight(str);
      p.line(yy * 4, 0, yy * 4, lado * 2);
      str -= 0.5;
    }
    p.pop();
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") {
      p.saveCanvas("rev2", "png");
    }
  };
};
