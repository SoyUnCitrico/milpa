import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/audioGraf.js`.
 * Generador + analizador: un `p5.Oscillator` controlado por sliders de frecuencia
 * (escala logarítmica) y volumen, con su espectro FFT (lin/log) y forma de onda
 * dibujados en tiempo real. Las teclas 1–4 cambian el tipo de onda, `p`/`s`
 * arrancan/paran y `l` alterna escala lin/log.
 *
 * Usa `P5` (constructor) para instanciar los componentes de p5.sound. El tamaño,
 * que en el original era `windowWidth/Height`, se fija para el contenedor.
 */
export const audioGraf: SketchFactory = (p: p5, P5?: typeof p5) => {
  const Sound = P5 as unknown as { Oscillator: new () => any; FFT: new () => any };

  let osc1: any, fft: any;
  let sliderFreq: p5.Element;
  let sliderVol: p5.Element;
  let isLog: boolean;
  let textColor: p5.Color;

  const W = 800;
  const H = 600;

  p.setup = () => {
    p.createCanvas(W, H);
    p.fill(255);
    p.colorMode(p.HSB);
    sliderFreq = p.createSlider(0, 800, 0, 0.1);
    sliderFreq.style("width: 794px");
    sliderFreq.position(0, 0);

    sliderVol = p.createSlider(0, 1, 0, 0.01);
    sliderVol.style("width: 392px");
    sliderVol.style("transform: rotate(270deg)");
    sliderVol.position(W - 205, (H * 3) / 9);

    osc1 = new Sound.Oscillator();
    osc1.setType("sine");
    isLog = true;

    osc1.freq(sliderFreq.value());
    osc1.amp(sliderVol.value());
    osc1.start();

    fft = new Sound.FFT();
    textColor = p.color(160, 255, 80);
  };

  p.draw = () => {
    p.background(0);

    const freq = logslider(sliderFreq.value() as number, 0, 800, 20, 20000);
    const vol = sliderVol.value() as number;
    osc1.freq(freq);
    osc1.amp(vol);

    p.noStroke();
    p.fill(textColor);
    p.text("Oscilador: " + osc1.getType(), p.width / 5, 50);
    p.text(freq + "  Hz", (p.width * 2) / 5, 50);
    p.text(vol + " vol", (p.width * 3) / 5, 50);

    const spectrum = fft.analyze(1024);
    p.noStroke();
    for (let i = 0; i < spectrum.length; i++) {
      const c = p.map(i, 0, spectrum.length, 0, 255);
      p.fill(c, 255, 255);

      if (isLog) {
        const a = p.map(p.log(i), 0, p.log(spectrum.length), 0, p.width);
        const b = p.map(spectrum[i], 0, 255, 0, p.height / 3);
        p.rect(a, p.height, p.width / spectrum.length, -b);
        p.fill(textColor);
        p.text("LOG", (p.width * 3) / 4, 50);
      } else {
        const a = p.map(i, 0, spectrum.length, 0, p.width);
        const b = p.map(spectrum[i], 0, 255, 0, p.height / 3);
        p.rect(a, p.height, p.width / spectrum.length, -b);
        p.fill(textColor);
        p.text("LIN", (p.width * 3) / 4, 50);
      }
    }

    const waveform = fft.waveform(1024, "float32");
    p.noFill();
    p.beginShape();
    p.stroke(100, 255, 255);
    for (let i = 0; i < waveform.length; i++) {
      const x = p.map(i, 0, waveform.length, 0, p.width);
      const y = p.map(waveform[i], -1, 1, p.height / 3, (p.height * 2) / 3);
      p.vertex(x, y);
    }
    p.endShape();
  };

  p.keyPressed = () => {
    if (p.key === "1") osc1.setType("sine");
    if (p.key === "2") osc1.setType("triangle");
    if (p.key === "3") osc1.setType("square");
    if (p.key === "4") osc1.setType("sawtooth");
    if (p.key === "p") {
      osc1.start();
      osc1.amp(sliderVol.value(), 2);
    }
    if (p.key === "s") {
      osc1.amp(0, 2);
      osc1.stop();
    }
    if (p.key === "l") isLog = !isLog;
  };

  function logslider(position: number, min: number, max: number, minLog: number, maxLog: number) {
    const minp = min;
    const maxp = max;
    const minv = Math.log(minLog);
    const maxv = Math.log(maxLog);
    const scale = (maxv - minv) / (maxp - minp);
    return Math.exp(minv + scale * (position - minp));
  }
};
