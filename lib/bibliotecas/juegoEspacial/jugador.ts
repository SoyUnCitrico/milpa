import type p5 from "p5";

/**
 * Jugador del `spaceGame`: una nave triangular (silueta clásica tipo
 * "asteroids", punta adelante / base atrás) que se mueve libremente por el
 * lienzo (WASD, ver `spaceGame.ts`) y siempre apunta hacia el cursor.
 *
 * El ángulo hacia el mouse se calcula una sola vez por frame dentro de la
 * clase (`actualizarAngulo`) para no duplicar el mismo `atan2` en
 * `spaceGame.ts::disparar()` — ese método simplemente lee `this.angulo`.
 *
 * Reescritura en p5 de la clase `Player` (Canvas 2D) del original, que era un
 * círculo blanco fijo en el centro.
 */
export class Jugador {
  p: p5;
  x: number;
  y: number;
  radio: number;
  color: string;
  /** Ángulo (radianes) hacia el mouse, recalculado cada frame por `actualizarAngulo`. */
  angulo: number;

  constructor(p: p5, x: number, y: number, radio: number, color: string) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.radio = radio;
    this.color = color;
    this.angulo = 0;
  }

  /** Recalcula el ángulo hacia el cursor. Fuente única: `disparar()` reutiliza `this.angulo`. */
  actualizarAngulo() {
    this.angulo = Math.atan2(this.p.mouseY - this.y, this.p.mouseX - this.x);
  }

  dibujar() {
    const p = this.p;
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.angulo);
    p.noStroke();
    p.fill(this.color);
    // Triángulo local: punta al frente (+x), base atrás. Proporciones a ojo
    // (nariz 1.6×radio, base 1×radio de ancho/alto) — revisar visualmente.
    p.triangle(
      this.radio * 1.6,
      0,
      -this.radio,
      -this.radio * 0.9,
      -this.radio,
      this.radio * 0.9,
    );
    p.pop();
  }
}
