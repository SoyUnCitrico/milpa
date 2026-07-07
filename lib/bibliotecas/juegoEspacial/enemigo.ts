import type p5 from "p5";

/**
 * Enemigo del `spaceGame`: aparece en un borde y persigue al jugador en línea
 * recta. Reescritura en p5 de la clase `Enemy` (Canvas 2D).
 *
 * El encogido al recibir un impacto se hacía en el original con `gsap.to(...)`;
 * aquí se reemplaza por un tween manual: `radio` interpola hacia `radioObjetivo`
 * cada frame (sin dependencia de gsap).
 */
export class Enemigo {
  p: p5;
  x: number;
  y: number;
  radio: number;
  radioObjetivo: number;
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
    this.radioObjetivo = radio;
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
    // Tween manual del radio (reemplaza gsap).
    this.radio = this.p.lerp(this.radio, this.radioObjetivo, 0.2);
    this.dibujar();
    this.x += this.velocidad.x;
    this.y += this.velocidad.y;
  }

  /** Encoge el enemigo en `cantidad` px de forma suave. */
  encoger(cantidad: number) {
    this.radioObjetivo -= cantidad;
  }
}
