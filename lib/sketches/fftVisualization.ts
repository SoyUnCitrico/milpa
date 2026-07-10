import type p5 from "p5";
import { Knob } from "../bibliotecas/knob";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `Talleres2021-CC2/.../CC2/fft_Visualization.js`,
 * restilizado.
 *
 * Visualizador de audio sobre una canción (`synth.mp3`): autocorrelación de la
 * forma de onda (curvas superiores) + espectro de frecuencias en disposición
 * polar. Cambios sobre el original:
 *   - Botones (Play/Stop/Random) con estilo cyberpunk y hover naranja.
 *   - Los sliders de volumen y velocidad pasan a `Knob`.
 *   - Las curvas de autocorrelación superiores se pintan con la paleta del sitio
 *     y un acento brillante en naranja.
 *   - Nueva animación de fondo AUDIO-REACTIVA (glow central que respira con los
 *     graves + silueta de espectro reflejada) DETRÁS de las líneas, círculos y
 *     cuadrados.
 *
 * Usa `P5` para instanciar los componentes de p5.sound. La tecla `t` alterna
 * entre la canción y el micrófono; `s` guarda el canvas.
 */

const SLUG = "fft-visualization";

/** Paleta cyberpunk (tokens del sitio). */
const PALETA = {
  fondoTrail: "#050805", // matrix-black (fundido de estelas)
  lineasSup: "#ff8c1a", // neon-orange (curvas superiores)
  lineasSupAcento: "#ffae42", // neon-amber (acento brillante)
  espectroStroke: "#00ff41", // matrix-green
  espectroFill: "#00e5ff", // cian
  centroStroke: "#a855f7", // neon-violet
  centroFill: "#0f2015", // matrix-panelLight
  acentoPunto: "#ffae42", // neon-amber
  fondoGlow: "#00b341", // matrix-dim (glow de graves)
  texto: "#7fffa8", // matrix-text
};

export const fftVisualization: SketchFactory = (p: p5, P5?: typeof p5) => {
  const Sound = P5 as unknown as {
    AudioIn: new () => any;
    FFT: new (smooth?: number, bins?: number) => any;
  };

  const bNormalize = true;
  const centerClip = false;

  let song: any, fft: any, mic: any;
  let knobVol: Knob, knobRate: Knob;
  let audioInput = false;
  let isPlaying = false;

  let colorBack: p5.Color, color1: p5.Color, color2: p5.Color, color3: p5.Color, color4: p5.Color, color4b: p5.Color;
  let nZstroke = 0;
  let aumentoStroke = 0.3;

  const toggleSong = () => {
    p.userStartAudio();
    if (!song.isPlaying()) {
      song.play();
      isPlaying = true;
    } else {
      song.stop();
      isPlaying = false;
    }
  };

  const alto = () => {
    song.stop();
    isPlaying = false;
  };

  const jumpSong = () => {
    song.jump(p.random(song.duration()));
  };

  const toggleInput = () => {
    if (audioInput) {
      mic.start();
      fft.setInput(mic);
      audioInput = false;
    } else {
      mic.stop();
      fft.setInput(song);
      audioInput = true;
    }
  };

  const autoCorrelate = (buffer: Float32Array): number[] => {
    const nSamples = buffer.length;
    const newBuffer: number[] = [];

    if (centerClip) {
      const cutoff = 0.1;
      for (let i = 0; i < buffer.length; i++) {
        const val = buffer[i];
        buffer[i] = Math.abs(val) > cutoff ? val : 0;
      }
    }

    for (let lag = 0; lag < nSamples; lag++) {
      let sum = 0;
      for (let index = 0; index < nSamples; index++) {
        const indexLagged = index + lag;
        if (indexLagged < nSamples) {
          sum += buffer[index] * buffer[indexLagged];
        }
      }
      newBuffer[lag] = sum / nSamples;
    }

    if (bNormalize) {
      let biggestVal = 0;
      for (let index = 0; index < nSamples; index++) {
        if (Math.abs(newBuffer[index]) > biggestVal) biggestVal = Math.abs(newBuffer[index]);
      }
      for (let index = 0; index < nSamples; index++) {
        newBuffer[index] /= biggestVal;
      }
    }

    return newBuffer;
  };

  const infoText = () => {
    p.push();
    p.translate(0, 130);
    p.noStroke();
    p.fill(PALETA.texto);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12);
    p.text("vol: " + knobVol.value().toFixed(2), p.width * 0.1, 0);
    p.text("time: " + song.currentTime().toFixed(2), p.width / 2.7, 0);
    p.pop();
  };

  // NUEVA animación de fondo audio-reactiva (se dibuja DETRÁS de todo).
  const fondoReactivo = (spectrum: number[]) => {
    p.push();
    p.noStroke();

    // 1) Glow central que respira con los graves.
    const bass = fft.getEnergy("bass"); // 0..255
    const cx = p.width / 2;
    const cy = (p.height * 3) / 4;
    for (let k = 5; k >= 1; k--) {
      const c = p.color(PALETA.fondoGlow);
      c.setAlpha(p.map(k, 1, 5, 0.1, 0.015) * (0.3 + bass / 255));
      p.fill(c);
      const r = p.map(bass, 0, 255, p.width * 0.15, p.width * 0.7) * (k / 3);
      p.ellipse(cx, cy, r);
    }

    // 2) Silueta de espectro reflejada (barras suaves en degradado cyberpunk).
    p.rectMode(p.CORNER);
    const n = spectrum.length;
    const bw = p.width / n;
    for (let i = 0; i < n; i++) {
      const x = p.map(i, 0, n, 0, p.width);
      const amp = p.map(spectrum[i], 0, 255, 0, p.height * 0.35);
      const f = i / n;
      const c =
        f < 0.5
          ? p.lerpColor(p.color(PALETA.fondoGlow), p.color(PALETA.espectroFill), f / 0.5)
          : p.lerpColor(p.color(PALETA.espectroFill), p.color(PALETA.lineasSup), (f - 0.5) / 0.5);
      c.setAlpha(0.18);
      p.fill(c);
      p.rect(x, p.height - amp, bw + 1, amp);
      p.rect(x, 0, bw + 1, amp * 0.5); // reflejo tenue arriba
    }
    p.pop();
  };

  const ilustrar = () => {
    // Fundido de estelas a negro (antes ámbar translúcido).
    const trail = p.color(PALETA.fondoTrail);
    trail.setAlpha(0.25);
    p.background(trail);

    const spectrum = fft.analyze();

    // Fondo audio-reactivo, detrás de las líneas y del espectro polar.
    fondoReactivo(spectrum);

    // Autocorrelación (curvas superiores) — paleta del sitio + acento naranja.
    const timeDomain = fft.waveform(1024, "float32");
    const corrBuff = autoCorrelate(timeDomain);
    dibujaCurvasSup(corrBuff);

    p.translate(p.width / 2, (p.height * 3) / 4);

    // Espectro de frecuencias en disposición polar (círculos/cuadrados).
    p.beginShape();
    for (let i = spectrum.length / 4; i < spectrum.length - 9; i++) {
      const r = p.map(spectrum[i], 0, 255, 10, (p.width * 3) / 4);
      const angle = p.map(i, spectrum.length / 4, spectrum.length - 9, 150, 390);
      const x = r * p.cos(angle);
      const y = r * p.sin(angle);
      nZstroke = p.noise(nZstroke);
      p.strokeWeight(3 * nZstroke);
      p.stroke(color1);
      p.fill(color2);
      if (
        i >= spectrum.length / 2 &&
        i <= spectrum.length / 2 + spectrum.length / 16 + spectrum.length / 32
      ) {
        p.strokeWeight(5 * nZstroke);
        const acento = p.color(PALETA.acentoPunto);
        acento.setAlpha(0.5);
        p.stroke(acento);
        p.point(-x, -y / 3);
        p.stroke(color2);
        p.fill(color1);
      }
      p.rect(x, y, r / 10);
      nZstroke += aumentoStroke;
    }
    p.fill(colorBack);
    p.strokeWeight(2 * p.random());
    p.stroke(color3);
    p.ellipse(0, 0, p.map(spectrum[1], 0, 255, 10, p.width / 5));
    p.endShape();
    infoText();
  };

  // Curvas de autocorrelación superiores (espejo): naranja con acento ámbar.
  const dibujaCurvasSup = (corrBuff: number[]) => {
    p.noFill();
    for (const [col, peso] of [
      [color4, 2.5],
      [color4b, 1],
    ] as [p5.Color, number][]) {
      p.stroke(col);
      p.strokeWeight(peso);
      p.beginShape();
      for (let i = 0; i < corrBuff.length; i++) {
        const w = p.map(i, 0, corrBuff.length, 0, p.width);
        const h = p.map(corrBuff[i], -1, 1, 150, 0);
        p.curveVertex(w, h);
      }
      p.endShape();
      p.beginShape();
      for (let i = 0; i < corrBuff.length; i++) {
        const w = p.map(i, 0, corrBuff.length, p.width, 0);
        const h = p.map(corrBuff[i], -1, 1, 150, 0);
        p.curveVertex(w, h);
      }
      p.endShape();
    }
  };

  const estiloBoton = (btn: p5.Element) => {
    btn.style("background", "#0a140d");
    btn.style("color", PALETA.texto);
    btn.style("border", "1px solid #143b22");
    btn.style("border-radius", "4px");
    btn.style("font-family", "monospace");
    btn.style("font-size", "12px");
    btn.style("padding", "6px 12px");
    btn.style("cursor", "pointer");
    btn.style("letter-spacing", "0.5px");
    btn.mouseOver(() => {
      btn.style("border-color", "#ff8c1a");
      btn.style("color", "#ffae42");
      btn.style("box-shadow", "0 0 8px rgba(255,140,26,0.4)");
    });
    btn.mouseOut(() => {
      btn.style("border-color", "#143b22");
      btn.style("color", PALETA.texto);
      btn.style("box-shadow", "none");
    });
  };

  p.preload = () => {
    song = p.loadSound("/synth.mp3");
  };

  p.setup = () => {
    (p.getAudioContext() as AudioContext).suspend();
    p.createCanvas(800, 600);
    p.angleMode(p.DEGREES);
    p.colorMode(p.HSB);
    p.rectMode(p.CENTER);

    const button = p.createButton("▶ Play / Pause");
    button.mousePressed(toggleSong);
    button.position(12, 12);
    estiloBoton(button);

    const stopButton = p.createButton("■ Stop");
    stopButton.mousePressed(alto);
    stopButton.position(150, 12);
    estiloBoton(stopButton);

    const jumpButton = p.createButton("⟳ Random");
    jumpButton.mousePressed(jumpSong);
    jumpButton.position(228, 12);
    estiloBoton(jumpButton);

    knobVol = new Knob(p, { etiqueta: "Volumen", min: 0, max: 1, valor: 0.5, paso: 0.001 });
    knobVol.position(16, 54);
    knobRate = new Knob(p, { etiqueta: "Velocidad", min: 0, max: 2, valor: 1, paso: 0.001 });
    knobRate.position(88, 54);

    mic = new Sound.AudioIn();
    fft = new Sound.FFT(0.6, 64);

    // Paleta cyberpunk (hex; válidos también en modo HSB).
    colorBack = p.color(PALETA.centroFill);
    color1 = p.color(PALETA.espectroStroke);
    color2 = p.color(PALETA.espectroFill);
    color3 = p.color(PALETA.centroStroke);
    color4 = p.color(PALETA.lineasSup);
    color4b = p.color(PALETA.lineasSupAcento);
    nZstroke = p.random();
    aumentoStroke = 0.3;

    const bg = p.color(PALETA.fondoTrail);
    p.background(bg);
  };

  p.draw = () => {
    if (isPlaying) {
      song.setVolume(knobVol.value());
      song.rate(knobRate.value());
      ilustrar();
    } else {
      p.push();
      p.background(0);
      p.textSize(40);
      p.noStroke();
      p.fill(PALETA.texto);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("Presiona el botón de play", p.width / 2, p.height / 2);
      p.pop();
    }
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
    if (p.key === "t") toggleInput();
  };
};
