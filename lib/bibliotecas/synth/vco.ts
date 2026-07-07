import type p5 from "p5";
import { ScreenPlotter } from "./screenPlotter";

/**
 * Osciladores del sintetizador portados de `creativeCode/libraries/synth/VCO.js`
 * a modo instancia. `VCO` envuelve un `p5.Oscillator`; `PWM` un `p5.Pulse` (ancho
 * de pulso variable). Ambos dibujan su forma de onda/espectro en un `ScreenPlotter`
 * y exponen sliders de frecuencia/volumen/paneo.
 *
 * Reciben `p` (instancia) y `P5` (constructor, para `new P5.Oscillator/Pulse` y
 * `P5.Vector.add`). Los nodos de p5.sound se tipan como `any` (no tipados de forma
 * fiable en @types/p5).
 */
export class VCO {
  p: p5;
  P5: typeof p5;
  type: string;
  frecuency: number;
  vol: number;
  pos: p5.Vector;
  size: p5.Vector;
  finalPos: p5.Vector;
  plotWave: boolean;
  osc: any;
  sliderVol: p5.Element;
  sliderFreq: p5.Element;
  sliderPan: p5.Element;
  screen: ScreenPlotter;

  constructor(
    p: p5,
    P5: typeof p5,
    _type: string,
    _frecuency: number,
    _volume: number,
    _pos?: p5.Vector,
    _size?: p5.Vector,
  ) {
    this.p = p;
    this.P5 = P5;
    this.type = _type;
    this.frecuency = _frecuency;
    this.vol = _volume;
    this.pos = _pos ?? p.createVector(0, 0);
    this.size = _size ?? p.createVector(300, 150);
    this.finalPos = P5.Vector.add(this.pos, this.size);
    this.plotWave = true;

    this.osc = new (P5 as any).Oscillator();

    this.sliderVol = p.createSlider(0, 1, 0, 0.01);
    let sliderPosX = p.map(this.size.x * 0.725, 0, this.size.x, this.pos.x, this.finalPos.x);
    let sliderPosY = p.map(this.size.y * 0.45, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderVol.style("transform: rotate(270deg)");
    this.sliderVol.position(sliderPosX, sliderPosY);

    this.sliderFreq = p.createSlider(0, 200, 50, 0.1);
    this.sliderFreq.style("width: 245px");
    sliderPosX = p.map(this.size.x * 0.05, 0, this.size.x, this.pos.x, this.finalPos.x);
    sliderPosY = p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderFreq.position(sliderPosX, sliderPosY);

    this.sliderPan = p.createSlider(-1, 1, 0, 0.01);
    this.sliderPan.style("width: 245px");
    sliderPosX = p.map(this.size.x * 0.05, 0, this.size.x, this.pos.x, this.finalPos.x);
    sliderPosY = p.map(this.size.y * 0.8, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderPan.position(sliderPosX, sliderPosY);

    this.osc.setType(this.type);
    this.osc.freq(this.frecuency);
    this.osc.amp(this.vol);

    const posPlotter = p.createVector(this.pos.x + this.size.x * 0.07, this.pos.y + this.size.y * 0.25);
    const sizePlotter = p.createVector(this.size.x * 0.8, this.size.y * 0.5);
    this.screen = new ScreenPlotter(p, P5, sizePlotter, posPlotter);
    this.screen.configEntrada(this.osc);
  }

  setScreen() {
    this.screen.configEntrada(this.osc);
  }

  getSound() {
    return this.osc;
  }

  unplugged() {
    this.osc.disconnect();
  }

  plug(sound: unknown) {
    this.osc.connect(sound);
  }

  oscStart() {
    this.osc.start();
  }

  oscStop() {
    this.osc.stop();
  }

  setFreq(freq: number) {
    this.frecuency = freq;
    this.osc.freq(this.frecuency);
  }

  setVolume(vol: number) {
    this.vol = vol;
    this.osc.amp(this.vol);
  }

  setPan(pan: number) {
    this.osc.pan(pan);
  }

  setPhase(phase: number) {
    this.osc.phase(phase);
  }

  changeWave() {
    this.plotWave = !this.plotWave;
  }

  changeMode() {
    this.screen.changePlot();
  }

  changeVoice(wave: string) {
    switch (wave) {
      case "sine":
        this.osc.setType("sine");
        break;
      case "triangle":
        this.osc.setType("triangle");
        break;
      case "square":
        this.osc.setType("square");
        break;
      case "sawtooth":
        this.osc.setType("sawtooth");
        break;
    }
  }

  logslider(position: number, min: number, max: number, minLog: number, maxLog: number) {
    const minp = min;
    const maxp = max;
    const minv = Math.log(minLog);
    const maxv = Math.log(maxLog);
    const scale = (maxv - minv) / (maxp - minp);
    return Math.exp(minv + scale * (position - minp));
  }

  actualiza() {
    const freq = this.logslider(this.sliderFreq.value() as number, 0, 200, 20, 20000);
    const vol = this.sliderVol.value() as number;
    const pan = this.sliderPan.value() as number;
    this.osc.freq(freq);
    this.osc.amp(vol);
    this.osc.pan(pan);
  }

  dibuja() {
    this.actualiza();
    const p = this.p;
    p.push();
    p.noStroke();
    p.fill(0);
    p.rect(this.pos.x, this.pos.y, this.size.x, this.size.y);
    p.pop();

    if (this.plotWave) {
      this.screen.plotWave();
    } else {
      this.screen.plotFFT();
    }
  }
}

export class PWM {
  p: p5;
  P5: typeof p5;
  type: string;
  frecuency: number;
  vol: number;
  pos: p5.Vector;
  size: p5.Vector;
  finalPos: p5.Vector;
  plotWave: boolean;
  pwm: number;
  osc: any;
  sliderVol: p5.Element;
  sliderPWM: p5.Element;
  sliderFreq: p5.Element;
  sliderPan: p5.Element;
  screen: ScreenPlotter;

  constructor(
    p: p5,
    P5: typeof p5,
    _frecuency: number,
    _volume: number,
    _pos?: p5.Vector,
    _size?: p5.Vector,
  ) {
    this.p = p;
    this.P5 = P5;
    this.type = "square";
    this.frecuency = _frecuency;
    this.vol = _volume;
    this.pos = _pos ?? p.createVector(0, 0);
    this.size = _size ?? p.createVector(300, 150);
    this.finalPos = P5.Vector.add(this.pos, this.size);
    this.plotWave = true;
    this.pwm = 50;

    this.osc = new (P5 as any).Pulse();

    this.sliderVol = p.createSlider(0, 1, 0, 0.01);
    this.sliderVol.style("transform: rotate(270deg)");
    let sliderPosX = p.map(-60, 0, this.size.x, this.pos.x, this.finalPos.x);
    let sliderPosY = p.map(this.size.y * 0.45, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderVol.position(sliderPosX, sliderPosY);

    this.sliderPWM = p.createSlider(0, 1, 0.5, 0.01);
    this.sliderPWM.style("transform: rotate(270deg)");
    sliderPosX = p.map(this.finalPos.x * 0.37, 0, this.size.x, this.pos.x, this.finalPos.x);
    sliderPosY = p.map(this.size.y * 0.45, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderPWM.position(sliderPosX, sliderPosY);

    this.sliderFreq = p.createSlider(0, 200, 50, 0.1);
    this.sliderFreq.style("width: 245px");
    sliderPosX = p.map(this.size.x * 0.05, 0, this.size.x, this.pos.x, this.finalPos.x);
    sliderPosY = p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderFreq.position(sliderPosX, sliderPosY);

    this.sliderPan = p.createSlider(-1, 1, 0, 0.01);
    this.sliderPan.style("width: 245px");
    sliderPosX = p.map(this.size.x * 0.05, 0, this.size.x, this.pos.x, this.finalPos.x);
    sliderPosY = p.map(this.size.y * 0.8, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderPan.position(sliderPosX, sliderPosY);

    this.osc.freq(this.frecuency);
    this.osc.amp(this.vol);

    const posPlotter = p.createVector(this.pos.x + this.size.x * 0.07, this.pos.y + this.size.y * 0.4);
    const sizePlotter = p.createVector(this.size.x * 0.82, this.size.y * 0.25);
    this.screen = new ScreenPlotter(p, P5, sizePlotter, posPlotter);
    this.screen.configEntrada(this.osc);
  }

  setScreen() {
    this.screen.configEntrada(this.osc);
  }

  getSound() {
    return this.osc;
  }

  unplugged() {
    this.osc.disconnect();
  }

  plug(sound: unknown) {
    this.osc.connect(sound);
  }

  oscStart() {
    this.osc.start();
  }

  oscStop() {
    this.osc.stop();
  }

  setFreq(freq: number) {
    this.frecuency = freq;
    this.osc.freq(this.frecuency);
  }

  setVolume(vol: number) {
    this.vol = vol;
    this.osc.amp(this.vol);
  }

  setPan(pan: number) {
    this.osc.pan(pan);
  }

  setPhase(phase: number) {
    this.osc.phase(phase);
  }

  changeWave() {
    this.plotWave = !this.plotWave;
  }

  changeMode() {
    this.screen.changePlot();
  }

  changeVoice(wave: string) {
    switch (wave) {
      case "sine":
        this.osc.setType("sine");
        break;
      case "triangle":
        this.osc.setType("triangle");
        break;
      case "square":
        this.osc.setType("square");
        break;
      case "sawtooth":
        this.osc.setType("sawtooth");
        break;
    }
  }

  logslider(position: number, min: number, max: number, minLog: number, maxLog: number) {
    const minp = min;
    const maxp = max;
    const minv = Math.log(minLog);
    const maxv = Math.log(maxLog);
    const scale = (maxv - minv) / (maxp - minp);
    return Math.exp(minv + scale * (position - minp));
  }

  actualiza() {
    const freq = this.logslider(this.sliderFreq.value() as number, 0, 200, 20, 20000);
    const vol = this.sliderVol.value() as number;
    const pan = this.sliderPan.value() as number;
    const ancho = this.sliderPWM.value() as number;
    this.osc.freq(freq);
    this.osc.amp(vol);
    this.osc.pan(pan);
    this.osc.width(ancho);
  }

  dibuja() {
    this.actualiza();
    const p = this.p;
    p.push();
    p.noStroke();
    p.fill(0);
    p.rect(this.pos.x, this.pos.y, this.size.x, this.size.y);
    p.pop();

    if (this.plotWave) {
      this.screen.plotWave();
    } else {
      this.screen.plotFFT();
    }
  }
}
