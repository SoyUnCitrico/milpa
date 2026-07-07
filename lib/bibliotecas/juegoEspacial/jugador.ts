import type p5 from "p5";

/**
 * Jugador del `spaceGame`: un círculo fijo en el centro del lienzo.
 * Reescritura en p5 de la clase `Player` (Canvas 2D) del original.
 */
export class Jugador {
  p: p5;
  x: number;
  y: number;
  radio: number;
  color: string;

  constructor(p: p5, x: number, y: number, radio: number, color: string) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.radio = radio;
    this.color = color;
  }

  dibujar() {
    const p = this.p;
    p.noStroke();
    p.fill(this.color);
    p.circle(this.x, this.y, this.radio * 2);
  }
}
