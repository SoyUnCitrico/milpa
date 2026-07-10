import type p5 from "p5";

/**
 * "Bolita" detonadora del `soundCollider`: un círculo FIJO que el usuario coloca
 * con el clic (hasta 8). Las cajas móviles lo cruzan y disparan una voz del
 * sintetizador. Es solo geometría + dibujo con glow; la lógica de choque vive en
 * `Cajita` y el disparo (con detección de flanco) en el sketch.
 */
export class Colisionador {
  p: p5;
  dia: number;
  x: number;
  y: number;
  colHex: string;

  constructor(p: p5, x: number, y: number, diametro: number, colHex = "#ff8c1a") {
    this.p = p;
    this.dia = diametro;
    this.x = x;
    this.y = y;
    this.colHex = colHex;
  }

  mostrar() {
    const p = this.p;
    p.push();
    p.noStroke();
    const glow = p.color(this.colHex);
    glow.setAlpha(70);
    p.fill(glow);
    p.circle(this.x, this.y, this.dia * 1.8);
    p.fill(this.colHex);
    p.circle(this.x, this.y, this.dia);
    p.pop();
  }
}
