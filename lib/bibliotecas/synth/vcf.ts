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
 * Filtro del sintetizador, migrado de `p5.Filter` a `Tone.Filter`. Controles
 * antes en sliders, ahora en `Knob` (frecuencia log, ganancia, resonancia).
 */
export class VCF {
  p: p5;
  Tone: typeof Tone;
  frecuency: number;
  pos: p5.Vector;
  size: p5.Vector;
  finalPos: p5.Vector;
  plotWave: boolean;
  filter: Tone.Filter;
  knobGain: Knob;
  knobFreq: Knob;
  knobRes: Knob;
  screen: ScreenPlotter;

  constructor(
    p: p5,
    ToneModule: typeof Tone,
    tipo: BiquadFilterType,
    _frecuency: number,
    _resonancia: number,
    _pos?: p5.Vector,
    _size?: p5.Vector,
    colores?: ColoresPlotter,
  ) {
    this.p = p;
    this.Tone = ToneModule;
    this.frecuency = _frecuency;
    this.pos = _pos ?? p.createVector(0, 0);
    this.size = _size ?? p.createVector(300, 150);
    this.finalPos = this.pos.copy().add(this.size);
    this.plotWave = true;

    this.filter = new ToneModule.Filter(this.frecuency, tipo);
    this.filter.Q.value = _resonancia;

    this.knobFreq = new Knob(p, { etiqueta: "Frecuencia", min: 0, max: 200, valor: 200, paso: 0.1 });
    this.knobFreq.position(
      p.map(this.size.x * 0.1, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    this.knobGain = new Knob(p, { etiqueta: "Ganancia", min: 0, max: 1, valor: 0, paso: 0.01 });
    this.knobGain.position(
      p.map(this.size.x * 0.45, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    this.knobRes = new Knob(p, { etiqueta: "Resonancia", min: 0, max: 1, valor: 0, paso: 0.001 });
    this.knobRes.position(
      p.map(this.size.x * 0.75, 0, this.size.x, this.pos.x, this.finalPos.x),
      p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y),
    );

    const posPlotter = p.createVector(this.pos.x + this.size.x * 0.07, this.pos.y + this.size.y * 0.25);
    const sizePlotter = p.createVector(this.size.x * 0.8, this.size.y * 0.5);
    this.screen = new ScreenPlotter(p, ToneModule, sizePlotter, posPlotter, colores);
    this.screen.configEntrada(this.filter);
  }

  getFilter(): Tone.Filter {
    return this.filter;
  }

  unplugged() {
    this.filter.disconnect();
  }

  plug(destino: Tone.ToneAudioNode) {
    this.filter.connect(destino);
  }

  setScreen() {
    this.screen.configEntrada(this.filter);
  }

  changeWave() {
    this.plotWave = !this.plotWave;
  }

  changeMode() {
    this.screen.changePlot();
  }

  changeFilter(tipo: BiquadFilterType) {
    this.filter.type = tipo;
  }

  dispose() {
    this.filter.dispose();
    this.screen.dispose();
  }

  actualiza() {
    const freq = logslider(this.knobFreq.value(), 0, 200, 20, 20000);
    const gain = this.knobGain.value();
    const res = logslider(this.knobRes.value(), 0, 1, 1, 1000);
    this.filter.frequency.value = freq;
    this.filter.gain.value = gain;
    this.filter.Q.value = res;
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
