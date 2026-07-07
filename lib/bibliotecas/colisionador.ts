import type p5 from "p5";

/**
 * "Bolita" sonda del `soundCollider`, portada de
 * `Talleres2021-CC2/.../libraries/Colisionador.js` a modo instancia.
 *
 * Es solo el círculo con el que se prueban las colisiones (la lógica de choque
 * vive en `Cajita`). Su `freq` mapea la posición X a una frecuencia audible en
 * escala logarítmica.
 */
export class Colisionador {
  p: p5;
  dia: number;
  x: number;
  y: number;
  col: p5.Color;
  freq: number;

  constructor(p: p5, x: number, y: number, diametro: number) {
    this.p = p;
    this.dia = diametro;
    this.x = x;
    this.y = y;
    this.col = p.color(255, 0, 0);
    this.freq = this.logaritmicConv(this.x, 0, p.width, 20, 20000);
  }

  mostrar() {
    const p = this.p;
    p.noStroke();
    p.fill(this.col);
    p.ellipse(this.x, this.y, this.dia, this.dia);
  }

  mostrarActual(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.mostrar();
  }

  logaritmicConv(posicion: number, min: number, max: number, minLog: number, maxLog: number) {
    const minp = min;
    const maxp = max;
    const minv = Math.log(minLog);
    const maxv = Math.log(maxLog);
    const scale = (maxv - minv) / (maxp - minp);
    return Math.exp(minv + scale * (posicion - minp));
  }
}
