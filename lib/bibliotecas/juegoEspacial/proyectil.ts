import type p5 from "p5";

/**
 * Proyectil del `spaceGame`: se dispara desde el centro hacia el cursor y avanza
 * en línea recta. Reescritura en p5 de la clase `Proyectil` (Canvas 2D).
 */
export class Proyectil {
  p: p5;
  x: number;
  y: number;
  radio: number;
  color: string;
  velocidad: p5.Vector;

  constructor(
    p: p5,
    x: number,
    y: number,
    radio: number,
    color: string,
    velocidad: p5.Vector,
  ) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.radio = radio;
    this.color = color;
    this.velocidad = velocidad;
  }

  dibujar() {
    const p = this.p;
    p.noStroke();
    p.fill(this.color);
    p.circle(this.x, this.y, this.radio * 2);
  }

  actualizar() {
    this.dibujar();
    this.x += this.velocidad.x;
    this.y += this.velocidad.y;
  }
}
