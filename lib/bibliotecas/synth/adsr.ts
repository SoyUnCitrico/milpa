import type p5 from "p5";
import type * as Tone from "tone";
import { ScreenPlotter, type ColoresPlotter } from "./screenPlotter";
import { Knob } from "../knob";

/**
 * Envolvente ADSR, migrada de `p5.Envelope` a `Tone.Envelope`. A diferencia
 * de p5.sound, Tone no aplica el gain de forma implícita al "reproducir" un
 * nodo: la envolvente se conecta explícitamente a un `Tone.Gain` propio
 * (`this.gain`), que se inserta una sola vez en la cadena de señal vía
 * `plug()`/`unplugged()` (en vez de re-conectarse en cada trigger como hacía
 * el original con `env.play(sound)`).
 *
 * Aproximación deliberada (revisar de oído): `play()`/`triggerAD()` disparan
 * un ciclo attack→decay→release de duración fija en vez de la rampa exacta
 * del original a `sustain` en el tiempo de `attack`; `triggerA()`/`triggerR()`
 * (gate por mouse) sí son equivalentes directos.
 */
export class ADSR {
  p: p5;
  Tone: typeof Tone;
  pos: p5.Vector;
  size: p5.Vector;
  finalPos: p5.Vector;
  envelope: Tone.Envelope;
  gain: Tone.Gain;
  knobAttack: Knob;
  knobDecay: Knob;
  knobSustain: Knob;
  knobRelease: Knob;
  screen: ScreenPlotter;

  constructor(
    p: p5,
    ToneModule: typeof Tone,
    _a: number,
    _d: number,
    _s: number,
    _r: number,
    _pos?: p5.Vector,
    _size?: p5.Vector,
    colores?: ColoresPlotter,
  ) {
    this.p = p;
    this.Tone = ToneModule;
    this.pos = _pos ?? p.createVector(0, 0);
    this.size = _size ?? p.createVector(300, 150);
    this.finalPos = this.pos.copy().add(this.size);

    this.envelope = new ToneModule.Envelope(_a, _d, _s, _r);
    this.gain = new ToneModule.Gain(1);
    this.envelope.connect(this.gain.gain);

    this.knobAttack = new Knob(p, { etiqueta: "Attack", min: 0, max: 2, valor: _a, paso: 0.01 });
    this.knobAttack.position(
      p.map(this.size.x * 0.1, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    this.knobDecay = new Knob(p, { etiqueta: "Decay", min: 0, max: 2, valor: _d, paso: 0.01 });
    this.knobDecay.position(
      p.map(this.size.x * 0.32, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    this.knobSustain = new Knob(p, { etiqueta: "Sustain", min: 0, max: 1, valor: _s, paso: 0.01 });
    this.knobSustain.position(
      p.map(this.size.x * 0.54, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    this.knobRelease = new Knob(p, { etiqueta: "Release", min: 0, max: 2, valor: _r, paso: 0.01 });
    this.knobRelease.position(
      p.map(this.size.x * 0.76, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    const posPlotter = p.createVector(this.pos.x + this.size.x * 0.4, this.pos.y + this.size.y * 0.25);
    const sizePlotter = p.createVector(this.size.x * 0.5, this.size.y * 0.5);
    this.screen = new ScreenPlotter(p, ToneModule, sizePlotter, posPlotter, colores);
    this.screen.configEntrada(this.envelope);
  }

  getGain(): Tone.Gain {
    return this.gain;
  }

  unplugged() {
    this.gain.disconnect();
  }

  plug(destino: Tone.ToneAudioNode) {
    this.gain.connect(destino);
  }

  play() {
    const duracion = this.knobAttack.value() + this.knobDecay.value() + 0.05;
    this.envelope.triggerAttackRelease(duracion);
  }

  triggerA() {
    this.envelope.triggerAttack();
  }

  triggerR() {
    this.envelope.triggerRelease();
  }

  triggerAD() {
    const duracion = this.knobAttack.value() + this.knobDecay.value() + 0.05;
    this.envelope.triggerAttackRelease(duracion);
  }

  actualiza() {
    this.envelope.attack = this.knobAttack.value();
    this.envelope.decay = this.knobDecay.value();
    this.envelope.sustain = this.knobSustain.value();
    this.envelope.release = this.knobRelease.value();
  }

  dispose() {
    this.envelope.dispose();
    this.gain.dispose();
    this.screen.dispose();
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
    this.knobRelease.style("display: none");
    const p = this.p;
    p.push();
    p.noStroke();
    p.fill(0);
    p.rect(this.pos.x, this.pos.y, this.size.x, this.size.y);
    p.pop();
    this.screen.plotADSR();
  }
}
