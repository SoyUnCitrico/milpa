import type p5 from "p5";
import { ScreenPlotter } from "./screenPlotter";

/**
 * Envolvente ADSR del sintetizador portada de
 * `creativeCode/libraries/synth/ADSR.js` a modo instancia. Envuelve un
 * `p5.Envelope` con sliders de attack/decay/sustain/release y su `ScreenPlotter`.
 */
export class ADSR {
  p: p5;
  P5: typeof p5;
  a: number;
  d: number;
  s: number;
  r: number;
  pos: p5.Vector;
  size: p5.Vector;
  finalPos: p5.Vector;
  gain: number;
  env: any;
  sliderAttack: p5.Element;
  sliderDecay: p5.Element;
  sliderSustain: p5.Element;
  sliderRelease: p5.Element;
  screen: ScreenPlotter;

  constructor(
    p: p5,
    P5: typeof p5,
    _a: number,
    _d: number,
    _s: number,
    _r: number,
    _pos?: p5.Vector,
    _size?: p5.Vector,
  ) {
    this.p = p;
    this.P5 = P5;
    this.a = _a;
    this.d = _d;
    this.s = _s;
    this.r = _r;
    this.pos = _pos ?? p.createVector(0, 0);
    this.size = _size ?? p.createVector(300, 150);
    this.finalPos = P5.Vector.add(this.pos, this.size);
    this.gain = 1;

    this.env = new (P5 as any).Envelope(this.a, 1, this.d, this.s, this.r, 0);

    let sliderPosX = p.map(-this.pos.x * 0.175, 0, this.size.x, this.pos.x, this.finalPos.x);
    const sliderPosY = p.map(this.size.y * 0.45, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderAttack = p.createSlider(0, 2, 0, 0.01);
    this.sliderAttack.style("transform: rotate(270deg)");
    this.sliderAttack.position(sliderPosX, sliderPosY);

    sliderPosX = p.map(-this.pos.x * 0.075, 0, this.size.x, this.pos.x, this.finalPos.x);
    this.sliderDecay = p.createSlider(0, 2, 0, 0.01);
    this.sliderDecay.style("transform: rotate(270deg)");
    this.sliderDecay.position(sliderPosX, sliderPosY);

    sliderPosX = p.map(this.pos.x * 0.025, 0, this.size.x, this.pos.x, this.finalPos.x);
    this.sliderSustain = p.createSlider(0, 1, 1, 0.01);
    this.sliderSustain.style("transform: rotate(270deg)");
    this.sliderSustain.position(sliderPosX, sliderPosY);

    sliderPosX = p.map(this.pos.x * 0.125, 0, this.size.x, this.pos.x, this.finalPos.x);
    this.sliderRelease = p.createSlider(0, 2, 0, 0.01);
    this.sliderRelease.style("transform: rotate(270deg)");
    this.sliderRelease.position(sliderPosX, sliderPosY);

    const posPlotter = p.createVector(this.pos.x + this.size.x * 0.4, this.pos.y + this.size.y * 0.25);
    const sizePlotter = p.createVector(this.size.x * 0.5, this.size.y * 0.5);
    this.screen = new ScreenPlotter(p, P5, sizePlotter, posPlotter);
    this.screen.configEntrada(this.env);
  }

  getEnvelope() {
    return this.env;
  }

  unplugged() {
    this.env.disconnect();
  }

  plug(sound: unknown) {
    this.env.connect(sound);
  }

  play(sound: unknown) {
    this.env.play(sound);
  }

  triggerA(sound: unknown) {
    this.env.triggerAttack(sound);
  }

  triggerR(sound: unknown) {
    this.env.triggerRelease(sound);
  }

  triggerAD(sound?: unknown) {
    this.env.ramp(sound, 0, this.sliderAttack.value(), this.sliderSustain.value());
  }

  changeType(type: string) {
    switch (type) {
      case "log":
        this.env.setExp(true);
        break;
      case "lin":
        this.env.setExp(false);
        break;
    }
  }

  actualiza() {
    const attack = this.sliderAttack.value() as number;
    const decay = this.sliderDecay.value() as number;
    const sustain = this.sliderSustain.value() as number;
    const release = this.sliderRelease.value() as number;
    this.env.setADSR(attack, decay, sustain, release);
  }

  dibuja() {
    this.actualiza();
    const p = this.p;
    p.push();
    p.noStroke();
    p.fill(0);
    p.rect(this.pos.x, this.pos.y, this.size.x, this.size.y);
    p.pop();
    this.screen.plotADSR();
  }

  dibujaAD() {
    this.actualiza();
    this.sliderRelease.hide();
    const p = this.p;
    p.push();
    p.noStroke();
    p.fill(0);
    p.rect(this.pos.x, this.pos.y, this.size.x, this.size.y);
    p.pop();
    this.screen.plotADSR();
  }
}
