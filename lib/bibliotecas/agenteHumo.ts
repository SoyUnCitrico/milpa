import type p5 from "p5";

/**
 * Agente de campo de ruido, portado de
 * `Code-Package-p5.js/02_M/M_1_5_03/Agent.js` (Generative Design) a modo
 * instancia. Cada agente avanza en la dirección que le dicta el ruido Perlin 3D
 * y traza una línea, dejando contornos que fluyen ("Líneas de Humo").
 *
 * El original dependía del global `myp5`; aquí recibe `p` en el constructor.
 */
export class AgenteHumo {
  p: p5;
  vector: p5.Vector;
  vectorOld: p5.Vector;
  stepSize: number;
  angle: number;
  noiseZ: number;

  constructor(p: p5, noiseZRange: number) {
    this.p = p;
    this.vector = p.createVector(p.random(p.width), p.random(p.height));
    this.vectorOld = this.vector.copy();
    this.stepSize = p.random(1, 5);
    this.angle = 0;
    this.noiseZ = p.random(noiseZRange);
  }

  update(strokeWidth: number, noiseZVelocity: number) {
    const p = this.p;
    this.vector.x += p.cos(this.angle) * this.stepSize;
    this.vector.y += p.sin(this.angle) * this.stepSize;

    if (this.vector.x < -10) this.vector.x = this.vectorOld.x = p.width + 10;
    if (this.vector.x > p.width + 10) this.vector.x = this.vectorOld.x = -10;
    if (this.vector.y < -10) this.vector.y = this.vectorOld.y = p.height + 10;
    if (this.vector.y > p.height + 10) this.vector.y = this.vectorOld.y = -10;

    p.strokeWeight(strokeWidth * this.stepSize);
    p.line(this.vectorOld.x, this.vectorOld.y, this.vector.x, this.vector.y);

    this.vectorOld = this.vector.copy();
    this.noiseZ += noiseZVelocity;
  }

  update1(strokeWidth: number, noiseScale: number, noiseStrength: number, noiseZVelocity: number) {
    this.angle =
      this.p.noise(this.vector.x / noiseScale, this.vector.y / noiseScale, this.noiseZ) * noiseStrength;
    this.update(strokeWidth, noiseZVelocity);
  }

  update2(strokeWidth: number, noiseScale: number, noiseStrength: number, noiseZVelocity: number) {
    const p = this.p;
    this.angle = p.noise(this.vector.x / noiseScale, this.vector.y / noiseScale, this.noiseZ) * 24;
    this.angle = (this.angle - p.floor(this.angle)) * noiseStrength;
    this.update(strokeWidth, noiseZVelocity);
  }
}
