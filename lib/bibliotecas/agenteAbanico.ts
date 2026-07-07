import type p5 from "p5";

/**
 * Agente de campo de ruido con trazo en abanico, portado de
 * `Code-Package-p5.js/02_M/M_1_5_04/Agent.js` (Generative Design) a modo
 * instancia. Además de la línea de avance, dibuja un trazo perpendicular
 * (estilo 1) o una elipse (estilo 2) con un color HSB teal/oro, produciendo las
 * "pinceladas en abanico".
 *
 * El original dependía del global `myp5`; aquí recibe `p` en el constructor.
 */
export class AgenteAbanico {
  p: p5;
  vector: p5.Vector;
  vectorOld: p5.Vector;
  randomizer: number;
  stepSize: number;
  noiseZ: number;
  angle: number;
  color: p5.Color;
  noiseScale: number;
  noiseStrength: number;
  strokeWidth: number;
  agentWidthMin: number;
  agentWidthMax: number;
  zNoiseVelocity: number;

  constructor(
    p: p5,
    noiseStickingRange: number,
    agentAlpha: number,
    noiseScale: number,
    noiseStrength: number,
    strokeWidth: number,
    agentWidthMin: number,
    agentWidthMax: number,
    zNoiseVelocity: number,
  ) {
    this.p = p;
    this.vector = p.createVector(p.random(p.width), p.random(p.height));
    this.vectorOld = this.vector.copy();
    this.randomizer = p.random();
    this.stepSize = 1 + this.randomizer * 4;
    this.noiseZ = p.random(noiseStickingRange);
    this.angle = 0;
    this.color =
      this.randomizer < 0.5
        ? p.color(p.random(170, 190), 70, p.random(100), agentAlpha)
        : p.color(p.random(40, 60), 70, p.random(100), agentAlpha);
    this.noiseScale = noiseScale;
    this.noiseStrength = noiseStrength;
    this.strokeWidth = strokeWidth;
    this.agentWidthMin = agentWidthMin;
    this.agentWidthMax = agentWidthMax;
    this.zNoiseVelocity = zNoiseVelocity;
  }

  updateStart() {
    const p = this.p;
    this.angle =
      p.noise(this.vector.x / this.noiseScale, this.vector.y / this.noiseScale, this.noiseZ) *
      this.noiseStrength;

    this.vector.x += p.cos(this.angle) * this.stepSize;
    this.vector.y += p.sin(this.angle) * this.stepSize;

    if (this.vector.x < -10) this.vector.x = this.vectorOld.x = p.width + 10;
    if (this.vector.x > p.width + 10) this.vector.x = this.vectorOld.x = -10;
    if (this.vector.y < -10) this.vector.y = this.vectorOld.y = p.height + 10;
    if (this.vector.y > p.height + 10) this.vector.y = this.vectorOld.y = -10;
  }

  updateEnd() {
    this.vectorOld = this.vector.copy();
    this.noiseZ += this.zNoiseVelocity;
  }

  update1() {
    const p = this.p;
    this.updateStart();

    p.stroke(this.color);
    p.strokeWeight(this.strokeWidth);
    p.line(this.vectorOld.x, this.vectorOld.y, this.vector.x, this.vector.y);

    const agentWidth = p.map(this.randomizer, 0.1, 1, this.agentWidthMin, this.agentWidthMax);
    p.push();
    p.translate(this.vectorOld.x, this.vectorOld.y);
    p.rotate(p.atan2(this.vector.y - this.vectorOld.y, this.vector.x - this.vectorOld.x));
    p.line(0, -agentWidth, 0, agentWidth);
    p.pop();

    this.updateEnd();
  }

  update2() {
    const p = this.p;
    this.updateStart();

    p.stroke(this.color);
    p.strokeWeight(2);
    const agentWidth = p.map(this.randomizer, 0.1, 1, this.agentWidthMin, this.agentWidthMax) * 2;
    p.ellipse(this.vectorOld.x, this.vectorOld.y, agentWidth, agentWidth);

    this.updateEnd();
  }

  update3() {
    const p = this.p;
    this.updateStart();

    p.stroke(this.color);
    p.strokeWeight(2);
    const agentWidth = p.map(this.randomizer, 0.1, 1, this.agentWidthMin, this.agentWidthMax) * 2;
    p.rect(this.vectorOld.x, this.vectorOld.y, agentWidth, agentWidth);

    this.updateEnd();
  }
}
