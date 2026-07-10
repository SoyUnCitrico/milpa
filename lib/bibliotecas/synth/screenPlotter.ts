import type p5 from "p5";
import type * as Tone from "tone";

/** Colores de trazo del osciloscopio/espectro — configurables por sketch. */
export interface ColoresPlotter {
  onda: string;
  espectro: string;
}

const COLORES_DEFECTO: ColoresPlotter = { onda: "#33ff77", espectro: "#ff8c1a" };

/**
 * Pantalla/osciloscopio del sintetizador, migrada de `p5.FFT` a
 * `Tone.Analyser`. Mantiene dos analizadores (uno "waveform", uno "fft")
 * alimentados por el mismo nodo de entrada, ya que la biblioteca original
 * podía pedir ambas vistas de un mismo `p5.FFT`.
 *
 * Nota: `plotADSR` reutiliza el analizador de forma de onda para graficar el
 * valor de control de una envolvente (0–1) en vez de audio — mismo truco que
 * el original, que tapeaba el `p5.FFT` con la salida de un `p5.Envelope`.
 */
export class ScreenPlotter {
  p: p5;
  pos: p5.Vector;
  size: p5.Vector;
  isLog: boolean;
  finalPlot: p5.Vector;
  colores: ColoresPlotter;
  private analyserOnda: Tone.Analyser;
  private analyserEspectro: Tone.Analyser;

  constructor(
    p: p5,
    ToneModule: typeof Tone,
    size: p5.Vector,
    pos: p5.Vector,
    colores: ColoresPlotter = COLORES_DEFECTO,
  ) {
    this.p = p;
    this.pos = pos;
    this.size = size;
    this.isLog = true;
    this.colores = colores;
    this.finalPlot = size.copy().add(pos);
    this.analyserOnda = new ToneModule.Analyser("waveform", 1024);
    this.analyserEspectro = new ToneModule.Analyser("fft", 1024);
  }

  configEntrada(nodo: Tone.ToneAudioNode) {
    nodo.connect(this.analyserOnda);
    nodo.connect(this.analyserEspectro);
  }

  dispose() {
    this.analyserOnda.dispose();
    this.analyserEspectro.dispose();
  }

  plotFFT() {
    const p = this.p;
    const spectrum = this.analyserEspectro.getValue() as Float32Array;
    p.noStroke();
    p.fill(this.colores.espectro);
    for (let i = 0; i < spectrum.length; i++) {
      // Tone entrega el espectro en dB (~ -100 a 0); se remapea a 0–size.y.
      const db = p.constrain(spectrum[i], -100, 0);
      if (this.isLog) {
        const a = p.map(p.log(i + 1), 0, p.log(spectrum.length), this.pos.x, this.finalPlot.x);
        const b = p.map(db, -100, 0, 0, this.size.y);
        p.rect(a, this.finalPlot.y, this.size.x / spectrum.length, -b);
      } else {
        const a = p.map(i, 0, spectrum.length, this.pos.x, this.finalPlot.x);
        const b = p.map(db, -100, 0, 0, this.size.y);
        p.rect(a, this.finalPlot.y, this.size.x / spectrum.length, -b);
      }
    }
  }

  plotWave() {
    const p = this.p;
    const waveform = this.analyserOnda.getValue() as Float32Array;
    p.noFill();
    p.beginShape();
    p.stroke(this.colores.onda);
    for (let i = 0; i < waveform.length; i++) {
      const x = p.map(i, 0, waveform.length, this.pos.x, this.finalPlot.x);
      const y = p.map(waveform[i], -1, 1, this.pos.y, this.finalPlot.y);
      p.vertex(x, y);
    }
    p.endShape();
  }

  plotADSR() {
    const p = this.p;
    const waveform = this.analyserOnda.getValue() as Float32Array;
    const paso = Math.max(1, Math.floor(waveform.length / 32));
    p.noFill();
    p.beginShape();
    p.stroke(this.colores.onda);
    for (let i = 0; i < waveform.length; i += paso) {
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
