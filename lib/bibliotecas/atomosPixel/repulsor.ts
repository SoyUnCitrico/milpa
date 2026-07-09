// Fuerza transitoria tipo explosión (port directo de Repulsor.pde): un
// atractor de fuerza NEGATIVA que se crea en un punto, empuja a las partículas
// cercanas durante unos frames y se desvanece. Su fuerza se SUMA a la del
// comportamiento activo (el cluster la aplica antes de integrar la física).

import type p5 from "p5";

export class Repulsor {
  x: number;
  y: number;
  strength: number;
  radius: number;
  life: number;
  maxLife: number;

  constructor(x: number, y: number, strength: number, radius: number, life: number) {
    this.x = x;
    this.y = y;
    this.strength = strength;
    this.radius = radius;
    this.life = life;
    this.maxLife = life;
  }

  falloff(): number {
    return this.maxLife > 0 ? this.life / this.maxLife : 0;
  }

  age(): void {
    this.life--;
  }

  dead(): boolean {
    return this.life <= 0;
  }

  /** Feedback visual: anillo que se expande y desvanece. */
  draw(p: p5): void {
    p.noFill();
    p.strokeWeight(2);
    p.stroke(255, 220 * this.falloff());
    const d = this.radius * (1.4 - 0.4 * this.falloff());
    p.ellipse(this.x, this.y, d, d);
    p.noStroke();
  }
}
