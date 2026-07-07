import type p5 from "p5";
import { ScreenPlotter } from "./screenPlotter";

/**
 * Filtro del sintetizador (VCF) portado de
 * `creativeCode/libraries/synth/VCF.js` a modo instancia. Envuelve un
 * `p5.Filter` con sliders de frecuencia/ganancia/resonancia y su `ScreenPlotter`.
 */
export class VCF {
  p: p5;
  P5: typeof p5;
  type: string;
  frecuency: number;
  res: number;
  pos: p5.Vector;
  size: p5.Vector;
  finalPos: p5.Vector;
  plotWave: boolean;
  gain: number;
  filter: any;
  sliderGain: p5.Element;
  sliderFreq: p5.Element;
  sliderRes: p5.Element;
  screen: ScreenPlotter;

  constructor(
    p: p5,
    P5: typeof p5,
    _type: string,
    _frecuency: number,
    _res: number,
    _pos?: p5.Vector,
    _size?: p5.Vector,
  ) {
    this.p = p;
    this.P5 = P5;
    this.type = _type;
    this.frecuency = _frecuency;
    this.res = _res;
    this.pos = _pos ?? p.createVector(0, 0);
    this.size = _size ?? p.createVector(300, 150);
    this.finalPos = P5.Vector.add(this.pos, this.size);
    this.plotWave = true;
    this.gain = 1;

    this.filter = new (P5 as any).Filter();

    this.sliderGain = p.createSlider(0, 1, 0, 0.01);
    let sliderPosX = p.map(this.size.x * 0.725, 0, this.size.x, this.pos.x, this.finalPos.x);
    let sliderPosY = p.map(this.size.y * 0.45, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderGain.style("transform: rotate(270deg)");
    this.sliderGain.position(sliderPosX, sliderPosY);

    this.sliderFreq = p.createSlider(0, 200, 200, 0.1);
    this.sliderFreq.style("width: 245px");
    sliderPosX = p.map(this.size.x * 0.05, 0, this.size.x, this.pos.x, this.finalPos.x);
    sliderPosY = p.map(this.size.y * 0.05, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderFreq.position(sliderPosX, sliderPosY);

    this.sliderRes = p.createSlider(0, 1, 0, 0.001);
    this.sliderRes.style("width: 245px");
    sliderPosX = p.map(this.size.x * 0.05, 0, this.size.x, this.pos.x, this.finalPos.x);
    sliderPosY = p.map(this.size.y * 0.8, 0, this.size.y, this.pos.y, this.finalPos.y);
    this.sliderRes.position(sliderPosX, sliderPosY);

    this.filter.setType(this.type);
    this.filter.freq(this.frecuency);
    this.filter.gain(this.gain);

    const posPlotter = p.createVector(this.pos.x + this.size.x * 0.07, this.pos.y + this.size.y * 0.25);
    const sizePlotter = p.createVector(this.size.x * 0.8, this.size.y * 0.5);
    this.screen = new ScreenPlotter(p, P5, sizePlotter, posPlotter);
    this.screen.configEntrada(this.filter);
  }

  getFilter() {
    return this.filter;
  }

  unplugged() {
    this.filter.disconnect();
  }

  plug(sound: unknown) {
    this.filter.connect(sound);
  }

  filterToggle() {
    this.filter.toggle();
  }

  setScreen() {
    this.screen.configEntrada(this.filter);
  }

  setFreq(freq: number) {
    this.frecuency = freq;
    this.filter.freq(this.frecuency);
  }

  setGain(gain: number) {
    this.gain = gain;
    this.filter.gain(this.gain);
  }

  setRes(res: number) {
    this.res = res;
    this.filter.pan(this.res);
  }

  changeWave() {
    this.plotWave = !this.plotWave;
  }

  changeMode() {
    this.screen.changePlot();
  }

  changeFilter(typeFilter: string) {
    switch (typeFilter) {
      case "lowpass":
      case "highpass":
      case "bandpass":
      case "lowshelf":
      case "highshelf":
      case "peaking":
      case "notch":
        this.filter.setType(typeFilter);
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
    const gain = this.sliderGain.value() as number;
    const res = this.logslider(this.sliderRes.value() as number, 0, 1, 1, 1000);
    this.filter.freq(freq);
    this.filter.gain(gain);
    this.filter.res(res);
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
