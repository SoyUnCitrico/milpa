import type p5 from "p5";
import type * as Tone from "tone";
import { ScreenPlotter, type ColoresPlotter } from "./screenPlotter";
import { Knob } from "../knob";

function logslider(position: number, min: number, max: number, minLog: number, maxLog: number) {
  const minv = Math.log(minLog);
  const maxv = Math.log(maxLog);
  const scale = (maxv - minv) / (max - min);
  return Math.exp(minv + scale * (position - min));
}

/**
 * Oscilador del sintetizador, migrado de `p5.Oscillator` (p5.sound) a
 * `Tone.Oscillator`. Cadena interna: osc → panner (paneo estéreo, ausente en
 * el Oscillator de Tone) → lo que conecte `plug()`. Controles antes en
 * sliders, ahora en `Knob` (frecuencia log, volumen, paneo).
 */
export class VCO {
  p: p5;
  Tone: typeof Tone;
  frecuency: number;
  vol: number;
  pos: p5.Vector;
  size: p5.Vector;
  finalPos: p5.Vector;
  plotWave: boolean;
  osc: Tone.Oscillator;
  panner: Tone.Panner;
  knobVol: Knob;
  knobFreq: Knob;
  knobPan: Knob;
  screen: ScreenPlotter;

  constructor(
    p: p5,
    ToneModule: typeof Tone,
    tipo: OscillatorType,
    _frecuency: number,
    _volume: number,
    _pos?: p5.Vector,
    _size?: p5.Vector,
    colores?: ColoresPlotter,
  ) {
    this.p = p;
    this.Tone = ToneModule;
    this.frecuency = _frecuency;
    this.vol = _volume;
    this.pos = _pos ?? p.createVector(0, 0);
    this.size = _size ?? p.createVector(300, 150);
    this.finalPos = this.pos.copy().add(this.size);
    this.plotWave = true;

    this.panner = new ToneModule.Panner(0);
    this.osc = new ToneModule.Oscillator(this.frecuency, tipo);
    this.osc.volume.value = ToneModule.gainToDb(this.vol);
    this.osc.connect(this.panner);

    this.knobFreq = new Knob(p, { etiqueta: "Frecuencia", min: 0, max: 200, valor: 50, paso: 0.1 });
    this.knobFreq.position(
      p.map(this.size.x * 0.1, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    this.knobVol = new Knob(p, { etiqueta: "Volumen", min: 0, max: 1, valor: 0, paso: 0.01 });
    this.knobVol.position(
      p.map(this.size.x * 0.55, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    this.knobPan = new Knob(p, { etiqueta: "Paneo", min: -1, max: 1, valor: 0, paso: 0.01 });
    this.knobPan.position(
      p.map(this.size.x * 0.8, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    const posPlotter = p.createVector(this.pos.x + this.size.x * 0.07, this.pos.y + this.size.y * 0.25);
    const sizePlotter = p.createVector(this.size.x * 0.8, this.size.y * 0.5);
    this.screen = new ScreenPlotter(p, ToneModule, sizePlotter, posPlotter, colores);
    this.screen.configEntrada(this.panner);
  }

  setScreen() {
    this.screen.configEntrada(this.panner);
  }

  unplugged() {
    this.panner.disconnect();
  }

  plug(destino: Tone.ToneAudioNode) {
    this.panner.connect(destino);
  }

  oscStart() {
    this.osc.start();
  }

  oscStop() {
    this.osc.stop();
  }

  changeWave() {
    this.plotWave = !this.plotWave;
  }

  changeMode() {
    this.screen.changePlot();
  }

  changeVoice(wave: OscillatorType) {
    this.osc.type = wave;
  }

  dispose() {
    this.osc.dispose();
    this.panner.dispose();
    this.screen.dispose();
  }

  actualiza() {
    const freq = logslider(this.knobFreq.value(), 0, 200, 20, 20000);
    const vol = this.knobVol.value();
    const pan = this.knobPan.value();
    this.osc.frequency.value = freq;
    this.osc.volume.value = this.Tone.gainToDb(Math.max(vol, 1e-4));
    this.panner.pan.value = pan;
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

/**
 * Oscilador de pulso (ancho variable), migrado de `p5.Pulse` a
 * `Tone.PulseOscillator` (tiene `.width` real, a diferencia de
 * `Tone.PWMOscillator` que modula internamente otra forma de onda).
 */
export class PWM {
  p: p5;
  Tone: typeof Tone;
  frecuency: number;
  vol: number;
  pos: p5.Vector;
  size: p5.Vector;
  finalPos: p5.Vector;
  plotWave: boolean;
  osc: Tone.PulseOscillator;
  panner: Tone.Panner;
  knobVol: Knob;
  knobPWM: Knob;
  knobFreq: Knob;
  knobPan: Knob;
  screen: ScreenPlotter;

  constructor(
    p: p5,
    ToneModule: typeof Tone,
    _frecuency: number,
    _volume: number,
    _pos?: p5.Vector,
    _size?: p5.Vector,
    colores?: ColoresPlotter,
  ) {
    this.p = p;
    this.Tone = ToneModule;
    this.frecuency = _frecuency;
    this.vol = _volume;
    this.pos = _pos ?? p.createVector(0, 0);
    this.size = _size ?? p.createVector(300, 150);
    this.finalPos = this.pos.copy().add(this.size);
    this.plotWave = true;

    this.panner = new ToneModule.Panner(0);
    this.osc = new ToneModule.PulseOscillator(this.frecuency, 0.5);
    this.osc.volume.value = ToneModule.gainToDb(this.vol);
    this.osc.connect(this.panner);

    this.knobFreq = new Knob(p, { etiqueta: "Frecuencia", min: 0, max: 200, valor: 50, paso: 0.1 });
    this.knobFreq.position(
      p.map(this.size.x * 0.1, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    this.knobVol = new Knob(p, { etiqueta: "Volumen", min: 0, max: 1, valor: 0, paso: 0.01 });
    this.knobVol.position(
      p.map(this.size.x * 0.4, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    this.knobPWM = new Knob(p, { etiqueta: "Ancho pulso", min: 0, max: 1, valor: 0.5, paso: 0.01 });
    this.knobPWM.position(
      p.map(this.size.x * 0.62, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    this.knobPan = new Knob(p, { etiqueta: "Paneo", min: -1, max: 1, valor: 0, paso: 0.01 });
    this.knobPan.position(
      p.map(this.size.x * 0.85, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    const posPlotter = p.createVector(this.pos.x + this.size.x * 0.07, this.pos.y + this.size.y * 0.4);
    const sizePlotter = p.createVector(this.size.x * 0.82, this.size.y * 0.25);
    this.screen = new ScreenPlotter(p, ToneModule, sizePlotter, posPlotter, colores);
    this.screen.configEntrada(this.panner);
  }

  setScreen() {
    this.screen.configEntrada(this.panner);
  }

  unplugged() {
    this.panner.disconnect();
  }

  plug(destino: Tone.ToneAudioNode) {
    this.panner.connect(destino);
  }

  oscStart() {
    this.osc.start();
  }

  oscStop() {
    this.osc.stop();
  }

  changeWave() {
    this.plotWave = !this.plotWave;
  }

  changeMode() {
    this.screen.changePlot();
  }

  changeVoice(_wave: OscillatorType) {
    // El PWM original solo modulaba ancho de pulso (siempre "square"); se
    // conserva el método por compatibilidad con las teclas 8/9/0 del sketch.
  }

  dispose() {
    this.osc.dispose();
    this.panner.dispose();
    this.screen.dispose();
  }

  actualiza() {
    const freq = logslider(this.knobFreq.value(), 0, 200, 20, 20000);
    const vol = this.knobVol.value();
    const pan = this.knobPan.value();
    const ancho = this.knobPWM.value();
    this.osc.frequency.value = freq;
    this.osc.volume.value = this.Tone.gainToDb(Math.max(vol, 1e-4));
    this.panner.pan.value = pan;
    this.osc.width.value = ancho;
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
