import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `Talleres2021-CC2/.../CC2/fft_Visualization.js`.
 *
 * Visualizador de audio sobre una canción (`synth.mp3`): dibuja la
 * autocorrelación de la forma de onda (curvas superiores) y un espectro de
 * frecuencias en disposición polar. Botones Play/Stop/Random, sliders de volumen
 * y velocidad, y la tecla `t` alterna entre la canción y el micrófono.
 *
 * Usa `P5` para instanciar los componentes de p5.sound. El asset se sirve desde
 * `public/synth.mp3` (copiado del taller). Se eliminó el `.parent('sketch-*')`
 * (el wrapper monta el canvas; botones y sliders se posicionan sobre el lienzo).
 */
export const fftVisualization: SketchFactory = (p: p5, P5?: typeof p5) => {
  const Sound = P5 as unknown as {
    AudioIn: new () => any;
    FFT: new (smooth?: number, bins?: number) => any;
  };

  const bNormalize = true;
  const centerClip = false;

  let song: any, fft: any, mic: any;
  let sliderVol: p5.Element, sliderRate: p5.Element;
  let audioInput = false;
  let isPlaying = false;

  let colorBack: p5.Color, color1: p5.Color, color2: p5.Color, color3: p5.Color, color4: p5.Color;
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
    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12);
    p.text("vol: " + (sliderVol.value() as number).toFixed(2), p.width * 0.1, 0);
    p.text("time: " + song.currentTime().toFixed(2), p.width / 2.7, 0);
    p.pop();
  };

  const ilustrar = () => {
    p.background(191, 98, 15, 0.2);

    // Autocorrelación (curvas amarillas superiores, en espejo).
    const timeDomain = fft.waveform(1024, "float32");
    const corrBuff = autoCorrelate(timeDomain);
    p.stroke(color4);
    p.noFill();
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
    p.noFill();
    p.translate(p.width / 2, (p.height * 3) / 4);

    // Espectro de frecuencias en disposición polar (ángulos en grados).
    const spectrum = fft.analyze();
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
        p.stroke(45, 91, 95, 0.5);
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

  p.preload = () => {
    song = p.loadSound("/synth.mp3");
  };

  p.setup = () => {
    (p.getAudioContext() as AudioContext).suspend();
    p.createCanvas(800, 600);
    p.angleMode(p.DEGREES);
    p.colorMode(p.HSB);
    p.rectMode(p.CENTER);

    const button = p.createButton("Play / Pause");
    button.mousePressed(toggleSong);
    button.position(10, 10);
    const stopButton = p.createButton("Stop");
    stopButton.mousePressed(alto);
    stopButton.position(110, 10);
    const jumpButton = p.createButton("Random");
    jumpButton.mousePressed(jumpSong);
    jumpButton.position(160, 10);

    sliderVol = p.createSlider(0, 1, 0.5, 0.001);
    sliderVol.position(10, 44);
    sliderRate = p.createSlider(0, 2, 1, 0.001);
    sliderRate.position(10, 68);

    mic = new Sound.AudioIn();
    fft = new Sound.FFT(0.6, 64);

    colorBack = p.color(191, 98, 15);
    color1 = p.color(169, 88, 55);
    color2 = p.color(169, 83, 85);
    color3 = p.color(45, 91, 95);
    color4 = p.color(39, 94, 75);
    nZstroke = p.random();
    aumentoStroke = 0.3;
    p.background(colorBack);
  };

  p.draw = () => {
    if (isPlaying) {
      song.setVolume(sliderVol.value() as number);
      song.rate(sliderRate.value() as number);
      ilustrar();
    } else {
      p.push();
      p.background(0);
      p.textSize(40);
      p.noStroke();
      p.fill(255);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("Presiona el botón de play", p.width / 2, p.height / 2);
      p.pop();
    }
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("fft-visualization", "png");
    if (p.key === "t") toggleInput();
  };
};
