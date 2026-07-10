import type p5 from "p5";
import type * as Tone from "tone";
import { VCO, PWM } from "../bibliotecas/synth/vco";
import { VCF } from "../bibliotecas/synth/vcf";
import { ADSR } from "../bibliotecas/synth/adsr";
import { Knob } from "../bibliotecas/knob";
import { onRemove } from "../bibliotecas/cleanup";
import type { SketchFactory } from "../types";

/** Paleta del sketch — ajustar aquí sin tocar la lógica de dibujo. */
const PALETA = {
  fondo: "#050805", // matrix-black
  trazoOnda: "#33ff77", // verde neón (osciloscopios de módulo)
  trazoEspectro: "#ff8c1a", // naranja neón (espectros / títulos)
  panel: "#0a140d", // matrix-panel
  linea: "#143b22", // matrix-line
  texto: "#7fffa8", // matrix-text
  activo: "#00ff41", // matrix-green (voz activa)
  inactivo: "#143b22", // matrix-line (voz apagada)
  scope: "#00e5ff", // cian (traza del vectorscopio)
  scopeEje: "#143b22", // ejes del scope
};

/** Parámetros por defecto del synth — modificar aquí, no en la lógica. */
const CONFIG = {
  vco1: { tipo: "sine" as OscillatorType, freq: 440, vol: 0.3 },
  vco2: { freq: 440, vol: 0.2 },
  filtro: { tipo: "lowpass" as BiquadFilterType, freq: 20000, resonancia: 1 },
  // Única envolvente = VCA. Gateada por el mouse (attack al pulsar, release al
  // soltar). Sustain > 0 para que sostenga mientras se mantiene el clic.
  adsr: { attack: 0.02, decay: 0.12, sustain: 0.6, release: 0.4 },
  delay: {
    timeMin: 0.02,
    timeMax: 0.8,
    time: 0.25,
    fbMin: 0,
    fbMax: 0.9,
    feedback: 0.4,
    wet: 0.35,
  },
  // Valores iniciales de los knobs de frecuencia (posición 0-200 → log Hz).
  // 90 ≈ 440 Hz (A4) para que suene afinado al primer clic.
  posFreqA4: 90,
};

const SLUG = "synth";
const W = 600;
const H = 760;

export const synth: SketchFactory = (p: p5, _P5?: typeof p5, ToneModule?: typeof Tone) => {
  const T = ToneModule as typeof Tone;

  let vco1: VCO, vco2: PWM, filter: VCF, adsr: ADSR;
  let mixer: Tone.Gain, delay: Tone.PingPongDelay, master: Tone.Gain;
  let split: Tone.Split, anaL: Tone.Analyser, anaR: Tone.Analyser;

  // Espejo en JS de los knobs del delay (para no leer `.value` tipado `Time`).
  let started = false;

  // --- Layout de regiones ---
  const yIndicadores = 300; // franja de indicadores de voz (sin knobs)
  const panelDelay = { x: 0, y: 340, w: W, h: 92 };
  const scope = { x: 170, y: 448, s: 282 }; // caja cuadrada del vectorscopio

  p.setup = () => {
    p.createCanvas(W, H);
    const colores = { onda: PALETA.trazoOnda, espectro: PALETA.trazoEspectro };

    const sizeMod = p.createVector(300, 150);
    const posVCO1 = p.createVector(0, 0);
    const posVCO2 = p.createVector(W / 2, 0);
    const posVCF = p.createVector(0, 150);
    const posADSR = p.createVector(W / 2, 150);

    vco1 = new VCO(p, T, CONFIG.vco1.tipo, CONFIG.vco1.freq, CONFIG.vco1.vol, posVCO1, sizeMod, colores);
    vco2 = new PWM(p, T, CONFIG.vco2.freq, CONFIG.vco2.vol, posVCO2, sizeMod, colores);
    filter = new VCF(p, T, CONFIG.filtro.tipo, CONFIG.filtro.freq, CONFIG.filtro.resonancia, posVCF, sizeMod, colores);
    adsr = new ADSR(p, T, CONFIG.adsr.attack, CONFIG.adsr.decay, CONFIG.adsr.sustain, CONFIG.adsr.release, posADSR, sizeMod, colores);

    // Valores iniciales de los knobs: afinación A4 y volúmenes audibles (VCO1
    // activo, VCO2 apagado por defecto para ilustrar el indicador de voces).
    vco1.knobFreq.value(CONFIG.posFreqA4);
    vco2.knobFreq.value(CONFIG.posFreqA4);
    vco1.knobVol.value(CONFIG.vco1.vol);
    vco2.knobVol.value(0);

    vco1.setScreen();
    vco2.setScreen();
    filter.setScreen();

    // --- Routeo: VCO1 + VCO2 → MIXER → VCF → VCA(ADSR) → DELAY → master ---
    mixer = new T.Gain(1);
    vco1.plug(mixer);
    vco2.plug(mixer);
    mixer.connect(filter.getFilter());
    filter.plug(adsr.getGain());

    // El VCA arranca CERRADO (gain intrínseco 0): la envolvente lo abre 0→sustain
    // al disparar y lo cierra en el release (sin esto el Gain(1) del ADSR dejaría
    // pasar la señal siempre).
    adsr.getGain().gain.value = 0;

    delay = new T.PingPongDelay(CONFIG.delay.time, CONFIG.delay.feedback);
    delay.wet.value = CONFIG.delay.wet;
    adsr.plug(delay);

    master = new T.Gain(0.9);
    delay.connect(master);
    master.connect(T.Destination);

    // Toma estéreo para el vectorscopio X-Y: separa L/R de la salida.
    split = new T.Split(2);
    master.connect(split);
    anaL = new T.Analyser("waveform", 512);
    anaR = new T.Analyser("waveform", 512);
    split.connect(anaL, 0, 0);
    split.connect(anaR, 1, 0);

    // Controles del delay (parte inferior media, en el panel del delay).
    const knobDTime = new Knob(p, {
      etiqueta: "Time",
      min: CONFIG.delay.timeMin,
      max: CONFIG.delay.timeMax,
      valor: CONFIG.delay.time,
      paso: 0.01,
      onChange: (v) => delay.delayTime.rampTo(v, 0.03),
    });
    knobDTime.position(panelDelay.x + 250, panelDelay.y + 18);

    const knobDFb = new Knob(p, {
      etiqueta: "Feedback",
      min: CONFIG.delay.fbMin,
      max: CONFIG.delay.fbMax,
      valor: CONFIG.delay.feedback,
      paso: 0.01,
      onChange: (v) => delay.feedback.rampTo(v, 0.03),
    });
    knobDFb.position(panelDelay.x + 340, panelDelay.y + 18);

    const knobDWet = new Knob(p, {
      etiqueta: "Mezcla",
      min: 0,
      max: 1,
      valor: CONFIG.delay.wet,
      paso: 0.01,
      onChange: (v) => {
        delay.wet.value = v;
      },
    });
    knobDWet.position(panelDelay.x + 430, panelDelay.y + 18);

    onRemove(p, () => {
      vco1.dispose();
      vco2.dispose();
      filter.dispose();
      adsr.dispose();
      mixer.dispose();
      delay.dispose();
      master.dispose();
      split.dispose();
      anaL.dispose();
      anaR.dispose();
    });
  };

  p.draw = () => {
    p.background(PALETA.fondo);
    vco1.dibuja();
    vco2.dibuja();
    filter.dibuja();
    adsr.dibuja();
    dibujaIndicadores(); // sobre los módulos, en franja sin knobs
    dibujaPanelDelay();
    dibujaScope();
    dibujaAyuda();
  };

  // Indicadores de voces activas: LED verde si el oscilador arrancó y su volumen
  // es audible; apagado (tenue) en caso contrario.
  function dibujaIndicadores() {
    const activo1 = started && vco1.knobVol.value() > 0.001;
    const activo2 = started && vco2.knobVol.value() > 0.001;
    p.push();
    p.textFont("monospace");
    p.textSize(12);
    p.textAlign(p.LEFT, p.CENTER);
    p.noStroke();
    p.fill(PALETA.trazoEspectro);
    p.text("VOCES:", 14, yIndicadores + 20);
    led(84, yIndicadores + 20, activo1, `VCO 1 · ${vco1.osc.type}`);
    led(300, yIndicadores + 20, activo2, "VCO 2 · pulso");
    p.pop();
  }

  function led(x: number, y: number, on: boolean, etiqueta: string) {
    p.push();
    p.noStroke();
    if (on) {
      const glow = p.color(PALETA.activo);
      glow.setAlpha(80);
      p.fill(glow);
      p.circle(x, y, 18);
    }
    p.fill(on ? PALETA.activo : PALETA.inactivo);
    p.circle(x, y, 10);
    p.fill(on ? PALETA.texto : PALETA.linea);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(etiqueta, x + 12, y);
    p.pop();
  }

  function dibujaPanelDelay() {
    p.push();
    const fondo = p.color(PALETA.panel);
    fondo.setAlpha(230);
    p.fill(fondo);
    p.stroke(PALETA.linea);
    p.strokeWeight(1);
    p.rect(panelDelay.x, panelDelay.y, panelDelay.w, panelDelay.h);
    p.noStroke();
    p.fill(PALETA.trazoEspectro);
    p.textFont("monospace");
    p.textSize(12);
    p.textAlign(p.LEFT, p.TOP);
    p.text("DELAY PING-PONG", 14, panelDelay.y + 12);
    p.fill(PALETA.texto);
    p.textSize(10);
    p.text("rebotes L↔R tras el VCA", 14, panelDelay.y + 30);
    p.pop();
  }

  // Vectorscopio X-Y: X = canal izquierdo, Y = canal derecho. Con paneo distinto
  // por voz y el ping-pong L/R, la salida traza figuras de Lissajous en vivo.
  function dibujaScope() {
    const waveL = anaL.getValue() as Float32Array;
    const waveR = anaR.getValue() as Float32Array;
    const cx = scope.x + scope.s / 2;
    const cy = scope.y + scope.s / 2;
    const r = (scope.s / 2) * 0.92;

    p.push();
    // Caja y ejes.
    const fondo = p.color(PALETA.panel);
    fondo.setAlpha(230);
    p.fill(fondo);
    p.stroke(PALETA.linea);
    p.strokeWeight(1);
    p.rect(scope.x, scope.y, scope.s, scope.s);
    p.stroke(PALETA.scopeEje);
    p.line(scope.x, cy, scope.x + scope.s, cy);
    p.line(cx, scope.y, cx, scope.y + scope.s);

    // Etiqueta.
    p.noStroke();
    p.fill(PALETA.trazoEspectro);
    p.textFont("monospace");
    p.textSize(12);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text("SCOPE X-Y  (X=L · Y=R)", scope.x, scope.y - 6);

    // Traza.
    p.noFill();
    p.stroke(PALETA.scope);
    p.strokeWeight(1);
    p.beginShape();
    const n = Math.min(waveL.length, waveR.length);
    for (let i = 0; i < n; i++) {
      p.vertex(cx + waveL[i] * r, cy - waveR[i] * r);
    }
    p.endShape();
    p.pop();
  }

  function dibujaAyuda() {
    p.push();
    p.noStroke();
    p.fill(PALETA.texto);
    p.textFont("monospace");
    p.textSize(11);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text(
      "clic: tocar (ADSR) · 1-4 voz VCO1 · 8-0 voz VCO2 · w onda/espectro · l lin/log · s guardar",
      W / 2,
      H - 8,
    );
    p.pop();
  }

  // El synth se inicia con el CLIC: arranca los osciladores la primera vez y
  // dispara el ataque del VCA; al soltar, dispara el release.
  p.mousePressed = () => {
    if (!started) {
      vco1.oscStart();
      vco2.oscStart();
      started = true;
    }
    adsr.triggerA();
  };

  p.mouseReleased = () => {
    adsr.triggerR();
  };

  p.keyPressed = () => {
    if (p.key === "1") vco1.changeVoice("sine");
    if (p.key === "2") vco1.changeVoice("triangle");
    if (p.key === "3") vco1.changeVoice("square");
    if (p.key === "4") vco1.changeVoice("sawtooth");

    if (p.key === "8") vco2.changeVoice("triangle");
    if (p.key === "9") vco2.changeVoice("square");
    if (p.key === "0") vco2.changeVoice("sawtooth");

    if (p.key === "w") {
      vco1.changeWave();
      vco2.changeWave();
      filter.changeWave();
    }

    if (p.key === "l") {
      vco1.changeMode();
      vco2.changeMode();
      filter.changeMode();
    }

    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
  };
};
