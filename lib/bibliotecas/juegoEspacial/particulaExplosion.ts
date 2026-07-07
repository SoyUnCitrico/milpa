import type p5 from "p5";

const FRICCION = 0.99;

/**
 * Partícula de explosión del `spaceGame`: fragmento que sale despedido al
 * destruir un enemigo, frena por fricción y se desvanece. Reescritura en p5 de
 * la clase `Particle` (Canvas 2D) del original.
 *
 * Nombre explícito (`ParticulaExplosion`) para no confundirla con la `Particle`
 * de `bibliotecas/particula.ts`, que es la partícula estilo Nature of Code de las
 * espirales (comportamiento distinto: wrap toroidal, sin fricción).
 */
export class ParticulaExplosion {
  p: p5;
  x: number;
  y: number;
  radio: number;
  color: string;
  velocidad: p5.Vector;
  alpha: number;

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
    this.alpha = 1;
  }

  dibujar() {
    const p = this.p;
    const c = p.color(this.color);
    c.setAlpha(this.alpha * 255);
    p.noStroke();
    p.fill(c);
    p.circle(this.x, this.y, this.radio * 2);
  }

  actualizar() {
    this.dibujar();
    this.velocidad.x *= FRICCION;
    this.velocidad.y *= FRICCION;
    this.x += this.velocidad.x;
    this.y += this.velocidad.y;
    this.alpha -= 0.01;
  }

  /** True cuando la partícula ya se desvaneció y puede eliminarse. */
  terminada() {
    return this.alpha <= 0;
  }
}
