import type p5 from "p5";

/**
 * Pantalla/osciloscopio del sintetizador, portada de
 * `creativeCode/libraries/synth/ScreenPlotter.js` a modo instancia.
 *
 * Toma una entrada de audio (oscilador, filtro o envolvente) vía un `p5.FFT` y la
 * grafica como forma de onda (`plotWave`), espectro (`plotFFT`) o envolvente
 * (`plotADSR`) dentro de un rectángulo `pos`/`size`. Recibe `p` (instancia, para la
 * API de dibujo) y `P5` (constructor, para `new P5.FFT()` y `P5.Vector.add`).
 */
export class ScreenPlotter {
  p: p5;
  pos: p5.Vector;
  size: p5.Vector;
  isLog: boolean;
  bNormalize: boolean;
  centerClip: boolean;
  finalPlot: p5.Vector;
  // Los nodos de p5.sound no están tipados de forma fiable en @types/p5: `any`.
  fft: any;

  constructor(p: p5, P5: typeof p5, size: p5.Vector, pos: p5.Vector) {
    this.p = p;
    this.pos = pos;
    this.size = size;
    this.isLog = true;
    this.bNormalize = true;
    this.centerClip = false;
    this.finalPlot = P5.Vector.add(this.size, this.pos);
    this.fft = new (P5 as any).FFT();
  }

  configEntrada(input: unknown) {
    this.fft.setInput(input);
  }

  plotFFT() {
    const p = this.p;
    const spectrum = this.fft.analyze(1024);
    p.noStroke();
    for (let i = 0; i < spectrum.length; i++) {
      const c = p.map(i, 0, spectrum.length, 0, 255);
      p.fill(c, 255, 255);

      if (this.isLog) {
        const a = p.map(p.log(i), 0, p.log(spectrum.length), this.pos.x, this.finalPlot.x);
        const b = p.map(spectrum[i], 0, 255, 0, this.size.y);
        p.rect(a, this.finalPlot.y, this.size.x / spectrum.length, -b);
      } else {
        const a = p.map(i, 0, spectrum.length, this.pos.x, this.finalPlot.x);
        const b = p.map(spectrum[i], 0, 255, 0, this.size.y);
        p.rect(a, this.finalPlot.y, this.size.x / spectrum.length, -b);
      }
    }
  }

  plotWave() {
    const p = this.p;
    const waveform = this.fft.waveform(1024, "float32");
    p.noFill();
    p.beginShape();
    p.stroke(100, 255, 255);
    for (let i = 0; i < waveform.length; i++) {
      const x = p.map(i, 0, waveform.length, this.pos.x, this.finalPlot.x);
      const y = p.map(waveform[i], -1, 1, this.pos.y, this.finalPlot.y);
      p.vertex(x, y);
    }
    p.endShape();
  }

  plotADSR() {
    const p = this.p;
    const waveform = this.fft.waveform(32, "float32");
    p.noFill();
    p.beginShape();
    p.stroke(100, 255, 255);
    for (let i = 0; i < waveform.length; i++) {
      const x = p.map(i, 0, waveform.length, this.pos.x, this.finalPlot.x);
      const y = p.map(waveform[i], 1, 0, this.pos.y, this.finalPlot.y);
      p.vertex(x, y);
    }
    p.endShape();
  }

  changePlot() {
    this.isLog = !this.isLog;
  }
}
