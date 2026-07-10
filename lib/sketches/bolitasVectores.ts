import type p5 from "p5";
import type * as Tone from "tone";
import { onRemove } from "../bibliotecas/cleanup";
import type { SketchFactory } from "../types";

/** Paleta del sketch — ajustar aquí sin tocar la lógica de dibujo. */
const PALETA = {
  fondo: "#04070a", // negro azulado profundo, casi puro
  frontera: "#1f6f4a", // verde apagado — antes gris plano stroke(120)
  // Colores disponibles para las bolitas: mantiene la identidad original
  // (cian/verde/magenta) y suma dos acentos neón (ámbar/violeta) para llegar
  // a 5 sin repetir tono, empujados a un duotono neón saturado sobre fondo
  // casi negro (antes RGB planos tipo pastel: (30,200,220), (30,200,30),
  // (200,30,180)).
  bolitas: ["#00e5ff", "#39ff6a", "#ff2fd1", "#ff8c1a", "#a855f7"],
};

/**
 * Tamaño ↔ frecuencia: bolitas chicas suenan agudas (campanita) y las
 * grandes graves (campana grande) — la misma relación que una marimba o
 * vibráfono real, donde una barra corta suena más aguda que una larga.
 * Mapeo lineal inverso entre el rango de tamaño y el de frecuencia (Hz).
 */
const CONFIG_BOLITAS = {
  cantidad: 5,
  sizeMin: 10,
  sizeMax: 55,
  freqMin: 220,
  freqMax: 1100,
  velMin: 2,
  velMax: 7,
};

/** Parámetros del instrumento de rebote — modificar aquí, no en la lógica. */
const CONFIG_SYNTH = {
  onda: "triangle" as OscillatorType,
  // Pasa-banda angosto centrado en agudos: da timbre de campana/marimba en
  // vez de un tono plano de oscilador.
  filtro: { tipo: "bandpass" as BiquadFilterType, freq: 3000, Q: 12 },
  // Ataque corto y sin sustain: envolvente percusiva tipo "pluck", no un
  // sostenido largo.
  envolvente: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.2 },
  // Pool de voces: permite que 2-3 rebotes casi simultáneos no se corten
  // entre sí, sin necesidad de polifonía real de 5 voces (una por bolita).
  numVoces: 3,
};

interface Bolita {
  pos: p5.Vector;
  vel: p5.Vector;
  size: number;
  color: string;
  freq: number;
}

interface Voz {
  osc: Tone.Oscillator;
  filtro: Tone.Filter;
  envolvente: Tone.Envelope;
  gain: Tone.Gain;
}

/**
 * Port en modo instancia de
 * `Talleres2021-CC1/.../Ejemplos/CC1_ejemplo2.5._Bolita_vectores_Muchos.js`,
 * reconvertido en un instrumento de rebote tipo campana/marimba.
 *
 * Arquitectura: pasa de variables sueltas por bolita (`posBolita`/`velBolita`/
 * `sizeBol` × 3) a un arreglo `Bolita[]` de tamaño fijo (5) — necesario
 * porque ahora cada bolita nace/muere por clic y cada una expone su propio
 * `freq` (Hz) para el sintetizador. Sigue habiendo una frontera rectangular
 * fija (barra espaciadora la muestra/oculta) que invierte la velocidad al
 * tocar el borde, como en el original.
 *
 * Audio: migrado a **Tone.js** (inyectado como 3er argumento de la factory
 * por `P5Sketch.tsx`). Un pool de `CONFIG_SYNTH.numVoces` voces (oscilador
 * triangular → filtro bandpass resonante → envolvente percusiva + gain
 * explícito → destino) se toma en round-robin en cada rebote, retonada a la
 * frecuencia de la bolita que golpeó el borde. Todos los nodos se disponen
 * al desmontar vía `onRemove` (ver `lib/bibliotecas/cleanup.ts`). Ver
 * "Bolitas Ping-Pong" en `algorithms.md` para el detalle de diseño.
 */
export const bolitasVectores: SketchFactory = (
  p: p5,
  _P5?: typeof p5,
  ToneModule?: typeof Tone,
) => {
  const T = ToneModule as typeof Tone;

  let bolitas: Bolita[] = [];
  let initFrontera: p5.Vector, finFrontera: p5.Vector;
  let isBorder = true;

  const voces: Voz[] = [];
  let siguienteVoz = 0;

  const crearVoz = (): Voz => {
    const osc = new T.Oscillator(440, CONFIG_SYNTH.onda).start();
    const filtro = new T.Filter(CONFIG_SYNTH.filtro.freq, CONFIG_SYNTH.filtro.tipo);
    filtro.Q.value = CONFIG_SYNTH.filtro.Q;
    const envolvente = new T.Envelope(
      CONFIG_SYNTH.envolvente.attack,
      CONFIG_SYNTH.envolvente.decay,
      CONFIG_SYNTH.envolvente.sustain,
      CONFIG_SYNTH.envolvente.release,
    );
    const gain = new T.Gain(0);
    envolvente.connect(gain.gain);
    osc.connect(filtro);
    filtro.connect(gain);
    gain.connect(T.Destination);
    return { osc, filtro, envolvente, gain };
  };

  // Retona la siguiente voz del pool a la frecuencia de la bolita que rebotó
  // y dispara su envolvente (mismo patrón de duración fija que ADSR.play()
  // en lib/bibliotecas/synth/adsr.ts).
  const suenaRebote = (freq: number) => {
    const voz = voces[siguienteVoz];
    siguienteVoz = (siguienteVoz + 1) % voces.length;
    voz.osc.frequency.value = freq;
    const duracion = CONFIG_SYNTH.envolvente.attack + CONFIG_SYNTH.envolvente.decay + 0.05;
    voz.envolvente.triggerAttackRelease(duracion);
  };

  // Mapeo lineal inverso: tamaño chico → frecuencia aguda, tamaño grande →
  // frecuencia grave.
  const freqDeTamano = (size: number) =>
    p.map(size, CONFIG_BOLITAS.sizeMin, CONFIG_BOLITAS.sizeMax, CONFIG_BOLITAS.freqMax, CONFIG_BOLITAS.freqMin);

  const nuevaBolita = (pos: p5.Vector, vel: p5.Vector, size: number, color: string): Bolita => ({
    pos,
    vel,
    size,
    color,
    freq: freqDeTamano(size),
  });

  const dibujaBolita = (bolita: Bolita) => {
    p.push();
    p.fill(bolita.color);
    p.noStroke();
    p.ellipse(bolita.pos.x, bolita.pos.y, bolita.size);
    p.pop();
  };

  const dibujarFrontera = (init: p5.Vector, end: p5.Vector) => {
    p.push();
    p.noFill();
    p.stroke(PALETA.frontera);
    p.strokeWeight(3);
    p.rectMode(p.CORNERS);
    p.rect(init.x, init.y, end.x, end.y);
    p.pop();
  };

  // Mueve cada bolita y, si rebota contra el borde, invierte la componente de
  // velocidad correspondiente y dispara el sintetizador a su frecuencia. Los
  // límites de la frontera son fijos y nunca se mutan, así que se comparan
  // directamente (el original clonaba `initFrontera`/`finFrontera` con
  // `.copy()` en cada frame dentro de `frontera()`, una asignación evitable).
  const actualizaBolitas = (frontIni: p5.Vector, frontFin: p5.Vector) => {
    for (const bolita of bolitas) {
      bolita.pos.add(bolita.vel);

      let reboto = false;
      if (bolita.pos.x < frontIni.x || bolita.pos.x > frontFin.x) {
        bolita.vel.x *= -1;
        reboto = true;
      }
      if (bolita.pos.y < frontIni.y || bolita.pos.y > frontFin.y) {
        bolita.vel.y *= -1;
        reboto = true;
      }
      if (reboto) suenaRebote(bolita.freq);
    }
    if (isBorder) dibujarFrontera(frontIni, frontFin);
  };

  p.setup = () => {
    p.createCanvas(600, 600);

    initFrontera = p.createVector(p.width / 4, 50);
    finFrontera = p.createVector((p.width * 3) / 4, p.height - 50);

    // Cinco bolitas iniciales, cada una con velocidad distinta (ninguna se
    // repite) y tamaño distinto (define su frecuencia vía freqDeTamano()).
    const iniciales: [p5.Vector, p5.Vector, number][] = [
      [p.createVector(p.width / 2, 60), p.createVector(1, 2), 50],
      [p.createVector(p.width / 3, p.height - 100), p.createVector(-5, -1), 25],
      [p.createVector(p.width / 4 + 80, 60), p.createVector(5, 7), 10],
      [p.createVector((p.width * 3) / 4 - 40, p.height / 2), p.createVector(-3, 4), 35],
      [p.createVector(p.width / 2 - 60, p.height - 150), p.createVector(2, -6), 18],
    ];
    bolitas = iniciales.map(([pos, vel, size], i) => nuevaBolita(pos, vel, size, PALETA.bolitas[i]));

    for (let i = 0; i < CONFIG_SYNTH.numVoces; i++) voces.push(crearVoz());

    onRemove(p, () => {
      for (const voz of voces) {
        voz.osc.dispose();
        voz.filtro.dispose();
        voz.envolvente.dispose();
        voz.gain.dispose();
      }
    });
  };

  p.draw = () => {
    p.background(PALETA.fondo);
    for (const bolita of bolitas) dibujaBolita(bolita);
    actualizaBolitas(initFrontera, finFrontera);
  };

  // Clic: "mata" la última bolita del arreglo y nace una nueva con tamaño,
  // velocidad, color y frecuencia distintos, en una posición aleatoria
  // dentro de la frontera. El arreglo se mantiene siempre en
  // CONFIG_BOLITAS.cantidad elementos (no se acumulan bolitas).
  p.mousePressed = () => {
    const size = p.random(CONFIG_BOLITAS.sizeMin, CONFIG_BOLITAS.sizeMax);
    const anguloVel = p.random(p.TWO_PI);
    const magVel = p.random(CONFIG_BOLITAS.velMin, CONFIG_BOLITAS.velMax);
    const vel = p.createVector(p.cos(anguloVel) * magVel, p.sin(anguloVel) * magVel);
    const pos = p.createVector(
      p.random(initFrontera.x + size, finFrontera.x - size),
      p.random(initFrontera.y + size, finFrontera.y - size),
    );
    const color = p.random(PALETA.bolitas) as string;
    bolitas[bolitas.length - 1] = nuevaBolita(pos, vel, size, color);
  };

  // La barra espaciadora muestra/oculta la frontera.
  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("bolitas-vectores", "png");
    if (p.keyCode === 32) {
      isBorder = !isBorder;
    }
  };
};
