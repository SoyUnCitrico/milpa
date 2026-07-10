import type p5 from "p5";
import { Knob } from "../bibliotecas/knob";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/audioGraf.js`, extendido.
 *
 * Generador + analizador: un `p5.Oscillator` cuya AMPLITUD la controla un ADSR
 * (VCA principal, `p5.Envelope`), con su espectro FFT (lin/log) y su forma de
 * onda dibujados en tiempo real. Cambios sobre el original:
 *   - Los sliders se reemplazan por dos `Knob` (frecuencia log y volumen)
 *     colocados al centro, a 1/4 de la altura del canvas.
 *   - El espectro deja el barrido arcoíris HSB por un degradado cyberpunk
 *     (verde → cian → naranja); el osciloscopio pasa a violeta.
 *   - El sonido se dispara con el MOUSE: clic = `triggerAttack`, soltar =
 *     `triggerRelease`. El ADSR es attack 1 s, decay 0 s, sustain 100 %,
 *     release 1.5 s. Se elimina el arranque/paro por teclas `p`/`s`; `s` ahora
 *     guarda el canvas.
 *
 * Usa `P5` (constructor) para instanciar los componentes de p5.sound.
 */

const SLUG = "audio-graf";

/** Paleta cyberpunk (tokens del sitio). */
const PALETA = {
  // Degradado del espectro FFT (de graves a agudos).
  fftBajo: "#00ff41", // matrix-green
  fftMedio: "#00e5ff", // cian cyberpunk
  fftAlto: "#ff8c1a", // neon-orange
  osciloscopio: "#a855f7", // neon-violet (línea de forma de onda)
  texto: "#7fffa8", // matrix-text
  valor: "#00ff41", // matrix-green (valores en vivo)
};

/** ADSR del VCA principal (pedido): A 1 s · D 0 s · S 100 % · R 1.5 s. */
const CONFIG_ADSR = { attack: 1, decay: 0, sustain: 1.0, release: 1.5 };

export const audioGraf: SketchFactory = (p: p5, P5?: typeof p5) => {
  const Sound = P5 as unknown as {
    Oscillator: new () => any;
    FFT: new () => any;
    Envelope: new () => any;
  };

  const W = 800;
  const H = 600;

  let osc1: any, fft: any, env: any;
  let isLog = true;

  // Estado espejo para el texto informativo.
  let freqHz = 0;
  let vol = 0.5;

  // Colores del degradado FFT (precomputados en setup).
  let colBajo: p5.Color, colMedio: p5.Color, colAlto: p5.Color;

  p.setup = () => {
    p.createCanvas(W, H);
    p.colorMode(p.RGB, 255);
    p.textFont("monospace");
    p.textSize(14);

    colBajo = p.color(PALETA.fftBajo);
    colMedio = p.color(PALETA.fftMedio);
    colAlto = p.color(PALETA.fftAlto);

    osc1 = new Sound.Oscillator();
    osc1.setType("sine");
    osc1.amp(0); // arranca en silencio; el ADSR controla la amplitud
    osc1.start();

    fft = new Sound.FFT();

    // VCA principal: ADSR que dispara el mouse. setRange fija el pico (volumen)
    // y el nivel de release (0). Sustain 100 % mantiene el pico mientras se
    // sostiene el clic.
    env = new Sound.Envelope();
    env.setADSR(CONFIG_ADSR.attack, CONFIG_ADSR.decay, CONFIG_ADSR.sustain, CONFIG_ADSR.release);
    env.setRange(vol, 0);

    // Perillas al centro, a 1/4 de la altura del canvas.
    const knobFreq = new Knob(p, {
      etiqueta: "Frecuencia",
      min: 0,
      max: 800,
      valor: 400,
      paso: 1,
      onChange: (posicion) => {
        freqHz = logslider(posicion, 0, 800, 20, 20000);
        osc1.freq(freqHz);
      },
    });
    knobFreq.position(W / 2 - 70, H / 4);

    const knobVol = new Knob(p, {
      etiqueta: "Volumen",
      min: 0,
      max: 1,
      valor: vol,
      paso: 0.01,
      onChange: (v) => {
        vol = v;
        env.setRange(vol, 0);
      },
    });
    knobVol.position(W / 2 + 22, H / 4);

    // Sincroniza el estado inicial (los knobs no llaman onChange al construirse).
    freqHz = logslider(400, 0, 800, 20, 20000);
    osc1.freq(freqHz);
  };

  p.draw = () => {
    p.background(0);

    // Info.
    p.noStroke();
    p.fill(PALETA.texto);
    p.text("Oscilador: " + osc1.getType(), p.width / 5, 40);
    p.fill(PALETA.valor);
    p.text(freqHz.toFixed(1) + " Hz", (p.width * 2) / 5, 40);
    p.text(vol.toFixed(2) + " vol", (p.width * 3) / 5, 40);
    p.fill(PALETA.texto);
    p.text(isLog ? "LOG" : "LIN", (p.width * 3) / 4, 40);
    p.text("clic: tocar (ADSR)", p.width / 5, 62);

    // Espectro FFT con degradado cyberpunk (verde → cian → naranja).
    const spectrum = fft.analyze(1024);
    p.noStroke();
    for (let i = 0; i < spectrum.length; i++) {
      p.fill(colorEspectro(i / spectrum.length));
      const b = p.map(spectrum[i], 0, 255, 0, p.height / 3);
      const a = isLog
        ? p.map(p.log(i), 0, p.log(spectrum.length), 0, p.width)
        : p.map(i, 0, spectrum.length, 0, p.width);
      p.rect(a, p.height, p.width / spectrum.length, -b);
    }

    // Osciloscopio (forma de onda) en violeta.
    const waveform = fft.waveform(1024, "float32");
    p.noFill();
    p.stroke(PALETA.osciloscopio);
    p.strokeWeight(1.5);
    p.beginShape();
    for (let i = 0; i < waveform.length; i++) {
      const x = p.map(i, 0, waveform.length, 0, p.width);
      const y = p.map(waveform[i], -1, 1, p.height / 3, (p.height * 2) / 3);
      p.vertex(x, y);
    }
    p.endShape();
  };

  // Degradado de dos tramos: 0-0.5 verde→cian, 0.5-1 cian→naranja.
  function colorEspectro(f: number): p5.Color {
    return f < 0.5
      ? p.lerpColor(colBajo, colMedio, f / 0.5)
      : p.lerpColor(colMedio, colAlto, (f - 0.5) / 0.5);
  }

  // Mouse = VCA: clic dispara el ataque, soltar dispara el release.
  p.mousePressed = () => {
    env.triggerAttack(osc1);
  };

  p.mouseReleased = () => {
    env.triggerRelease(osc1);
  };

  p.keyPressed = () => {
    if (p.key === "1") osc1.setType("sine");
    if (p.key === "2") osc1.setType("triangle");
    if (p.key === "3") osc1.setType("square");
    if (p.key === "4") osc1.setType("sawtooth");
    if (p.key === "l") isLog = !isLog;
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
  };

  function logslider(position: number, min: number, max: number, minLog: number, maxLog: number) {
    const minv = Math.log(minLog);
    const maxv = Math.log(maxLog);
    const scale = (maxv - minv) / (max - min);
    return Math.exp(minv + scale * (position - min));
  }
};
