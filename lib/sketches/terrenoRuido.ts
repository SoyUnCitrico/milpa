import type p5 from "p5";
import type * as Tone from "tone";
import { Knob } from "../bibliotecas/knob";
import { onRemove } from "../bibliotecas/cleanup";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `Code-Package-p5.js/02_M/M_1_4_01/sketch.js`
 * (Generative Design). Malla 3D (WEBGL) generada con ruido Perlin, reestilizada
 * al tema matrix del sitio y vuelta autónoma (dos LFOs modulan el rango de ruido
 * y el terreno gira lento en Z).
 *
 * AUDIO (nuevo, Tone.js — 3er argumento inyectado por `P5Sketch.tsx`): un DRON
 * audio-reactivo acoplado al "grado de ruido" de la animación.
 *   - Voz DRON: `PolySynth` de super-saw (`fatsawtooth`) tocando la secuencia de
 *     acordes Am–F–Am–G en octavas BAJAS (para abarcar el espectro y que el LPF
 *     tenga rango de modulación). Pasa por un LPF estilo Moog (lowpass -24) con
 *     un LFO en el cutoff y otro LFO en la resonancia (Q).
 *   - Voz RUIDO: ruido blanco por un BPF con un LFO en su cutoff. Su volumen lo
 *     modula el grado de ruido de la animación (más ruido → más volumen).
 *   - Una perilla fija el volumen MÁXIMO de ambas voces (empieza en 1). El
 *     volumen es continuo (rampas) y se activa/desactiva con un botón del GUI.
 * Todos los nodos se disponen al desmontar vía `onRemove`.
 */

/** Paleta del sketch — ajustar aquí sin tocar la lógica de dibujo. */
const PALETA = {
  fondo: "#050805", // matrix-black
  cuerpo: "#00ff41", // matrix-green
  cima: "#ff8c1a", // neon-orange
};

/** Secuencia de acordes en octavas bajas (4 o 5 voces según el acorde). */
const SECUENCIA: { nombre: string; notas: string[] }[] = [
  { nombre: "Am", notas: ["A1", "A2", "E3", "A3", "C4"] },
  { nombre: "F", notas: ["F1", "F2", "C3", "A3"] },
  { nombre: "Am", notas: ["A1", "A2", "E3", "A3", "C4"] },
  { nombre: "G", notas: ["G1", "G2", "D3", "B3"] },
];

const CHORD_DUR_MS = 4000; // duración de cada acorde del dron

interface Audio {
  poly: Tone.PolySynth<Tone.Synth>;
  moog: Tone.Filter;
  lfoCut: Tone.LFO;
  lfoRes: Tone.LFO;
  droneBus: Tone.Gain;
  noise: Tone.Noise;
  bpf: Tone.Filter;
  lfoBpf: Tone.LFO;
  noiseBus: Tone.Gain;
  master: Tone.Gain;
}

export const terrenoRuido: SketchFactory = (p: p5, _P5?: typeof p5, ToneModule?: typeof Tone) => {
  const T = ToneModule as typeof Tone;

  const tileCount = 50;
  const zScale = 150;

  let noiseXRange = 10;
  let noiseYRange = 10;
  let octaves = 4;
  let falloff = 0.5;

  const lfoFreqX = 0.03;
  const lfoFreqY = 0.047;
  const rangeMin = 4;
  const rangeMax = 16;

  const spinSpeed = 0.004;
  let spinZ = 0;

  let midColor: p5.Color, topColor: p5.Color, bottomColor: p5.Color;
  const threshold = 0.3;

  let offsetY = 0;
  let clickY = 0;
  let zoom = -300;
  let rotationX = 0;
  let targetRotationX = 0;
  let clickRotationX = 0;

  // --- Audio ---
  let audio: Audio | null = null;
  let activo = false;
  let volMax = 1; // perilla de volumen máximo (empieza en 1)
  let chordIndex = -1;
  let lastChord = 0;
  let lastDroneTarget = -1;
  let lastNoiseTarget = -1;
  let btnAudio: p5.Element;
  let statusDiv: p5.Element;
  let moogFreq = 200;

  const crearAudio = (): Audio => {
    // Voz DRON: super-saw polifónico → LPF Moog (LFO en cutoff + LFO en Q).
    const poly = new T.PolySynth(T.Synth, {
      oscillator: { type: "fatsawtooth", count: 5, spread: 45 },
      envelope: { attack: 1.6, decay: 0.4, sustain: 0.9, release: 2.6 },
      volume: -14,
    });
    poly.maxPolyphony = 12;

    const moog = new T.Filter(moogFreq, "lowpass");
    moog.rolloff = -24; // 4 polos ≈ Moog
    const lfoCut = new T.LFO(0.07, 60, 1400).start();
    lfoCut.connect(moog.frequency);
    const lfoRes = new T.LFO(0.05, 0.5, 8).start();
    lfoRes.type = "triangle";
    lfoRes.connect(moog.Q);
    // Que los LFOs manejen el rango completo del parámetro (sin offset base).
    moog.frequency.value = moogFreq;
    moog.Q.value = 0;

    const droneBus = new T.Gain(volMax);
    poly.connect(moog);
    moog.connect(droneBus);

    // Voz RUIDO: ruido blanco → BPF (LFO en cutoff).
    const noise = new T.Noise("white").start();
    const bpf = new T.Filter(800, "bandpass");
    bpf.Q.value = 2;
    const lfoBpf = new T.LFO(0.11, 300, 3000).start();
    lfoBpf.connect(bpf.frequency);
    bpf.frequency.value = 0;
    const noiseBus = new T.Gain(0);
    noise.connect(bpf);
    bpf.connect(noiseBus);

    // Salida: master gateado (fundido continuo al activar/desactivar).
    const master = new T.Gain(0);
    droneBus.connect(master);
    noiseBus.connect(master);
    master.connect(T.Destination);

    return { poly, moog, lfoCut, lfoRes, droneBus, noise, bpf, lfoBpf, noiseBus, master };
  };

  const avanzaAcorde = () => {
    if (!audio) return;
    chordIndex = (chordIndex + 1) % SECUENCIA.length;
    audio.poly.releaseAll();
    audio.poly.triggerAttack(SECUENCIA[chordIndex].notas);
    lastChord = p.millis();
  };

  const setActivo = (v: boolean) => {
    if (!audio) return;
    activo = v;
    if (v) {
      audio.master.gain.rampTo(1, 0.8);
      chordIndex = -1;
      avanzaAcorde();
    } else {
      audio.master.gain.rampTo(0, 0.8);
      audio.poly.releaseAll();
    }
    btnAudio.html(`Audio: ${v ? "ON" : "OFF"}`);
  };

  const estiloDOM = (el: p5.Element) => {
    el.style("background", "#0a140d");
    el.style("color", "#7fffa8");
    el.style("border", "1px solid #143b22");
    el.style("border-radius", "4px");
    el.style("font-family", "monospace");
    el.style("font-size", "12px");
    el.style("padding", "6px 12px");
  };

  p.setup = () => {
    p.createCanvas(1000, 1000, p.WEBGL);
    p.cursor(p.CROSS);
    p.colorMode(p.RGB);

    bottomColor = p.color(PALETA.fondo);
    midColor = p.color(PALETA.cuerpo);
    topColor = p.color(PALETA.cima);

    targetRotationX = p.PI / 3;

    // --- Audio + GUI ---
    audio = crearAudio();

    const knobVol = new Knob(p, {
      etiqueta: "Vol. máx",
      min: 0,
      max: 1,
      valor: volMax,
      paso: 0.01,
      onChange: (v) => {
        volMax = v;
      },
    });
    knobVol.position(12, 12);

    btnAudio = p.createButton("Audio: OFF");
    btnAudio.mousePressed(() => setActivo(!activo));
    estiloDOM(btnAudio);
    btnAudio.style("cursor", "pointer");
    btnAudio.mouseOver(() => {
      btnAudio.style("border-color", "#ff8c1a");
      btnAudio.style("color", "#ffae42");
    });
    btnAudio.mouseOut(() => {
      btnAudio.style("border-color", "#143b22");
      btnAudio.style("color", "#7fffa8");
    });
    btnAudio.position(84, 20);

    statusDiv = p.createDiv("Dron: —");
    estiloDOM(statusDiv);
    statusDiv.style("padding", "4px 8px");
    statusDiv.style("font-size", "11px");
    statusDiv.position(12, 92);

    onRemove(p, () => {
      if (!audio) return;
      audio.poly.dispose();
      audio.moog.dispose();
      audio.lfoCut.dispose();
      audio.lfoRes.dispose();
      audio.droneBus.dispose();
      audio.noise.dispose();
      audio.bpf.dispose();
      audio.lfoBpf.dispose();
      audio.noiseBus.dispose();
      audio.master.dispose();
    });
  };

  p.draw = () => {
    p.background(PALETA.fondo);

    const t = p.millis() / 1000;
    noiseXRange = p.map(p.sin(t * p.TWO_PI * lfoFreqX), -1, 1, rangeMin, rangeMax);
    noiseYRange = p.map(p.sin(t * p.TWO_PI * lfoFreqY), -1, 1, rangeMin, rangeMax);

    // Grado de ruido de la animación (0..1): densidad autónoma (respiración de
    // los rangos) + aspereza del usuario (octavas y falloff).
    const densidad = p.map((noiseXRange + noiseYRange) / 2, rangeMin, rangeMax, 0, 1);
    const aspereza = 0.5 * p.constrain(p.map(octaves, 0, 8, 0, 1), 0, 1) + 0.5 * falloff;
    const gradoRuido = p.constrain(0.5 * densidad + 0.5 * aspereza, 0, 1);

    actualizaAudio(gradoRuido);

    p.push();
    p.translate(p.width * 0.05, p.height * 0.05, zoom);

    if (p.mouseIsPressed && p.mouseButton === p.LEFT) {
      offsetY = p.mouseY - clickY;
      targetRotationX = p.min(
        p.max(clickRotationX + (offsetY / p.width) * p.TWO_PI, -p.HALF_PI),
        p.HALF_PI,
      );
    }
    rotationX += (targetRotationX - rotationX) * 0.25;
    spinZ += spinSpeed;
    p.rotateX(rotationX);
    p.rotateZ(-spinZ);

    p.noiseDetail(octaves, falloff);
    let noiseYMax = 0;

    const tileSizeY = p.height / tileCount;
    const noiseStepY = noiseYRange / tileCount;

    for (let meshY = 0; meshY <= tileCount; meshY++) {
      p.beginShape(p.TRIANGLE_STRIP);
      for (let meshX = 0; meshX <= tileCount; meshX++) {
        const x = p.map(meshX, 0, tileCount, -p.width / 2, p.width / 2);
        const y = p.map(meshY, 0, tileCount, -p.height / 2, p.height / 2);

        const noiseX = p.map(meshX, 0, tileCount, 0, noiseXRange);
        const noiseY = p.map(meshY, 0, tileCount, 0, noiseYRange);
        const z1 = p.noise(noiseX, noiseY);
        const z2 = p.noise(noiseX, noiseY + noiseStepY);

        noiseYMax = p.max(noiseYMax, z1);
        let interColor: p5.Color;
        let amount: number;
        if (z1 <= threshold) {
          amount = p.map(z1, 0, threshold, 0.15, 1);
          interColor = p.lerpColor(bottomColor, midColor, amount);
        } else {
          amount = p.map(z1, threshold, noiseYMax, 0, 1);
          interColor = p.lerpColor(midColor, topColor, amount);
        }
        p.fill(interColor);
        p.vertex(x, y, z1 * zScale);
        p.vertex(x, y + tileSizeY, z2 * zScale);
      }
      p.endShape();
    }
    p.pop();
  };

  // Aplica el grado de ruido al audio de forma continua (rampas cortas) y avanza
  // la secuencia de acordes del dron.
  function actualizaAudio(gradoRuido: number, freqCutoff?: number) {
    if (!audio) return;
    // Modifica la frecuencia actual del filtro Moog según la posición X del mouse (modulación de cutoff).
    if (freqCutoff !== undefined && Math.abs(freqCutoff - Number(audio.lfoCut.frequency.value)) > 0.5) {
      audio.lfoCut.frequency.value = freqCutoff;
    }
    // Volumen del dron = volumen máximo (constante). Ruido = máx · grado.
    const objDrone = volMax;
    if (Math.abs(objDrone - lastDroneTarget) > 0.005) {
      audio.droneBus.gain.rampTo(objDrone, 0.1);
      lastDroneTarget = objDrone;
    }
    const objNoise = volMax * gradoRuido;
    if (Math.abs(objNoise - lastNoiseTarget) > 0.01) {
      audio.noiseBus.gain.rampTo(objNoise, 0.15);
      lastNoiseTarget = objNoise;
    }



    if (activo && p.millis() - lastChord > CHORD_DUR_MS) avanzaAcorde();

    const nombre = chordIndex >= 0 ? SECUENCIA[chordIndex].nombre : "—";
    statusDiv.html(
      `Dron: ${activo ? nombre : "off"} · ruido: ${(gradoRuido * 100).toFixed(0)}%`,
    );
  }

  p.mousePressed = () => {
    clickY = p.mouseY;
    clickRotationX = rotationX;
    moogFreq = (p.mouseX / p.width) * 12000; // modulación de cutoff con X
    console.log(`Moog cutoff: ${moogFreq.toFixed(0)} Hz`);
  };

  p.keyReleased = () => {
    if (p.keyCode === p.UP_ARROW) falloff += 0.05;
    if (p.keyCode === p.DOWN_ARROW) falloff -= 0.05;
    falloff = p.constrain(falloff, 0, 1);

    if (p.keyCode === p.LEFT_ARROW) octaves--;
    if (p.keyCode === p.RIGHT_ARROW) octaves++;
    if (octaves < 0) octaves = 0;

    if (p.keyCode === 187) zoom += 20; // '+'
    if (p.keyCode === 189) zoom -= 20; // '-'

    if (p.key === "s" || p.key === "S") p.saveCanvas("terreno-ruido", "png");
    if (p.key === " ") p.noiseSeed(p.floor(p.random(100000)));
  };
};
