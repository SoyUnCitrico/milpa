import type p5 from "p5";
import { Particle } from "./particula";

/**
 * Espiral de partículas portada de `p5_works/bibliotecas/spirals.js` a modo
 * instancia. Recibe `p` y prefija la API global (`PI`, `sin`, `cos`, `width`,
 * `height`, `createVector`); construye cada `Particle` pasándole `p`.
 *
 * (radioInt == radioExt && cicles == 1) ? círculo : espiral.
 */
export class Spiral {
  p: p5;
  totalParticles: number;
  cicles: number;
  radioInt: number;
  radioExt: number;
  stepsRadio: number;
  particleSize: number;
  particleStroke: number;
  particleType: string;
  particleColor: string;
  particleStrokeColor: string;
  offsetAngle: number;
  spiral: Particle[];

  constructor(
    p: p5,
    totalParticles = 100,
    cicles = 1,
    radioInt = 10,
    radioExt = 100,
    stepsRadio = 200,
    particleSize = 5,
    particleStroke = 2,
    particleType = "circle",
    particleColor = "#000000",
    particleStrokeColor = "#000000",
  ) {
    this.p = p;
    this.totalParticles = totalParticles;
    this.cicles = cicles;
    this.radioInt = radioInt;
    this.radioExt = radioExt;
    this.stepsRadio = stepsRadio;
    this.particleSize = particleSize;
    this.particleStroke = particleStroke;
    this.particleType = particleType;
    this.particleColor = particleColor;
    this.particleStrokeColor = particleStrokeColor;
    this.offsetAngle = 0;

    this.spiral = [];
    for (let i = 0; i < this.totalParticles; i++) {
      const angleIncrement = (360 / this.totalParticles) * cicles;
      const angle =
        (p.PI / 180) * (angleIncrement * i + this.offsetAngle);
      const actualRadio =
        ((this.radioExt - this.radioInt) * i) / this.stepsRadio + this.radioInt;
      const xPos = actualRadio * p.sin(angle) + p.width / 2;
      const yPos = actualRadio * p.cos(angle) + p.height / 2;
      const newPos = p.createVector(xPos, yPos);
      const newParticle = new Particle(
        p,
        newPos,
        this.particleSize,
        this.particleStroke,
        this.particleType,
        this.particleColor,
        this.particleStrokeColor,
        angle,
      );
      this.spiral.push(newParticle);
    }
  }

  update() {
    const p = this.p;
    for (let i = 0; i < this.spiral.length; i++) {
      const angleIncrement = (360 / this.spiral.length) * this.cicles;
      const angle = (p.PI / 180) * (angleIncrement * i + this.offsetAngle);
      const actualRadio =
        ((this.radioExt - this.radioInt) * i) / this.stepsRadio + this.radioInt;
      const xPos = actualRadio * p.sin(angle) + p.width / 2;
      const yPos = actualRadio * p.cos(angle) + p.height / 2;
      const newPos = p.createVector(xPos, yPos);
      this.spiral[i].setPosition(newPos);
    }
  }

  setCicles(cicles: number) {
    this.cicles = cicles;
  }

  setParticleSize(size: number) {
    this.particleSize = size;
  }

  setRadioInt(newRadio: number) {
    this.radioInt = newRadio;
  }

  setRadioExt(newRadio: number) {
    this.radioExt = newRadio;
  }

  setColor(color: string) {
    this.particleColor = color;
  }

  setOffsetAngle(angle: number) {
    this.offsetAngle = angle;
  }

  getRadioInterior() {
    return this.radioInt;
  }

  getRadioExterior() {
    return this.radioExt;
  }

  getOffsetAngle() {
    return this.offsetAngle;
  }

  draw() {
    for (let i = 0; i < this.spiral.length; i++) {
      this.spiral[i].show(this.spiral[i].type);
    }
  }
}
