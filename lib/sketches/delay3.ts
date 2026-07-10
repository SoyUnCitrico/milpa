import type p5 from "p5";
import type * as Tone from "tone";
import { onRemove } from "../bibliotecas/cleanup";
import { Knob } from "../bibliotecas/knob";
import type { SketchFactory } from "../types";

/**
 * Escena audiovisual de `creativeCode/delay3.js`, extendida.
 *
 * BASE VISUAL (se conserva del original): un fundido de fondo en HSB — la
 * saturación y el brillo suben gradualmente desde negro hasta un vino profundo
 * a lo largo de ~5.4 s. A diferencia del original NO se detiene con `noLoop()`:
 * el `draw()` sigue corriendo para animar la escena y programar los ecos del
 * delay. Una vez alcanzado el color objetivo, el fundido se mantiene fijo.
 *
 * ESCENA (nueva): la escena (círculo central + rombos de los ecos) se dibuja en
 * una capa `p5.Graphics` transparente que se compone sobre el fundido cada
 * frame. Así el fundido de fondo sigue avanzando POR DETRÁS mientras la escena
 * persiste; al retriggerear se limpia la capa y se vuelve a dibujar todo.
 *
 * AUDIO (nuevo, Tone.js — 3er argumento inyectado por `P5Sketch.tsx`):
 *   VCO FM (portadora + modulador, razón inarmónica → timbre de campana)
 *   → VCF pasa-banda resonante (BPF)
 *   → VCA (Gain) modulado por una envolvente AD percusiva (sustain 0)
 *   → PingPongDelay (rebotes alternando canal L/R)
 *   → master → destino.
 * La profundidad de FM la modula una segunda envolvente AD para que el brillo
 * decaiga como en una campana real. Dos `Knob` en la parte central inferior
 * controlan el `delayTime` y el `feedback` del ping-pong.
 *
 * ACOPLE AUDIO↔VISUAL: al tocar el canvas se dispara la envolvente (suena la
 * campana) y se dibuja el círculo central; luego, cada rebote del delay agrega
 * un rombo de otro color a los lados, ALTERNADO (izq/der como el ping-pong). El
 * momento de cada rombo = n · delayTime (misma perilla que el delay), y su
 * opacidad = volumen del feedback en ese eco (feedback^n) atenuada por un factor
 * que TIENDE A 0 cuanto más tardado (mayor delayTime) sea el sonido. Todos los
 * nodos de Tone se disponen al desmontar vía `onRemove`.
 */

const SLUG = "delay3";

/** Paleta (tokens del sitio). */
const PALETA = {
  // Círculo central: verde neón matrix (la voz principal).
  centro: "#00ff41",
  // Rombos de los ecos: "otros colores", ciclados por eco.
  rombos: ["#ff8c1a", "#a855f7", "#ffae42", "#00e5ff", "#c98bff", "#ff6a00"],
};

/** Parámetros del instrumento — modificar aquí, no en la lógica. */
const CONFIG_FM = {
  // Portadora de la campana (nota base) y modulador inarmónico.
  portadora: 440,
  razonMod: 1.4, // razón no entera → parciales inarmónicos (campana)
  indiceMod: 620, // profundidad FM pico en Hz (modulada por la env AD)
};
const CONFIG_VCF = { tipo: "bandpass" as BiquadFilterType, freq: 1500, Q: 6 };
// VCA percusivo: ataque casi instantáneo, decaimiento largo y SIN sustain.
const CONFIG_VCA = { attack: 0.002, decay: 1.6, sustain: 0, release: 0.6 };
// Env de la profundidad FM: decae más rápido → el brillo cae como en campana.
const CONFIG_MODENV = { attack: 0.002, decay: 0.5, sustain: 0, release: 0.4 };
const CONFIG_DELAY = {
  timeMin: 0.06,
  timeMax: 0.8,
  time: 0.28,
  fbMin: 0,
  fbMax: 0.9,
  feedback: 0.6,
  wet: 0.7,
};

interface Voz {
  portadora: Tone.Oscillator;
  modulador: Tone.Oscillator;
  modGain: Tone.Gain;
  modScale: Tone.Gain;
  modEnv: Tone.Envelope;
  vcf: Tone.Filter;
  vca: Tone.Gain;
  vcaEnv: Tone.Envelope;
  delay: Tone.PingPongDelay;
  master: Tone.Gain;
}

export const delay3: SketchFactory = (p: p5, _P5?: typeof p5, ToneModule?: typeof Tone) => {
  const T = ToneModule as typeof Tone;

  const w = 1000;
  const h = 1000;

  // --- Fundido de fondo (base heredada del original) ---
  let br = 0;
  let st = 0;
  let vino3: p5.Color;
  let m: number, s: number, b: number;
  let sStep: number, bStep: number;
  let startMillis: number | null = null;
  const duration = 5390;
  const fps = 30;

  // --- Capa de escena (círculo + rombos), transparente, se compone encima ---
  let escena: p5.Graphics;

  // --- Estado del disparo/ecos ---
  let triggered = false;
  let trigTime = 0;
  let trigDelay = CONFIG_DELAY.time; // s congelados al disparar
  let trigFeedback = CONFIG_DELAY.feedback; // 0..1 congelado al disparar
  let ecosDibujados = 0;
  let maxEcos = 1;

  // Espejo en JS de los knobs (evita leer `.value` tipado como `Time`).
  let delayActual = CONFIG_DELAY.time;
  let fbActual = CONFIG_DELAY.feedback;

  // --- Audio ---
  let voz: Voz | null = null;

  const crearVoz = (): Voz => {
    // Cadena FM: modulador → modGain → portadora.frequency. La profundidad FM
    // (modGain.gain) parte de 0 y la escala la envolvente AD del modulador.
    const portadora = new T.Oscillator(CONFIG_FM.portadora, "sine").start();
    const modulador = new T.Oscillator(CONFIG_FM.portadora * CONFIG_FM.razonMod, "sine").start();
    const modGain = new T.Gain(0);
    const modScale = new T.Gain(CONFIG_FM.indiceMod);
    const modEnv = new T.Envelope(CONFIG_MODENV);
    modulador.connect(modGain);
    modGain.connect(portadora.frequency);
    modEnv.connect(modScale);
    modScale.connect(modGain.gain);

    // VCF pasa-banda resonante.
    const vcf = new T.Filter(CONFIG_VCF.freq, CONFIG_VCF.tipo);
    vcf.Q.value = CONFIG_VCF.Q;

    // VCA: Gain a 0 modulado por la envolvente AD percusiva.
    const vca = new T.Gain(0);
    const vcaEnv = new T.Envelope(CONFIG_VCA);
    vcaEnv.connect(vca.gain);

    // Ping-pong delay tras el VCA.
    const delay = new T.PingPongDelay(CONFIG_DELAY.time, CONFIG_DELAY.feedback);
    delay.wet.value = CONFIG_DELAY.wet;

    const master = new T.Gain(0.7);

    portadora.connect(vcf);
    vcf.connect(vca);
    vca.connect(delay);
    delay.connect(master);
    master.connect(T.Destination);

    return { portadora, modulador, modGain, modScale, modEnv, vcf, vca, vcaEnv, delay, master };
  };

  p.setup = () => {
    p.createCanvas(w, h);
    p.frameRate(fps);
    p.colorMode(p.HSB, 360, 100, 100, 100);
    vino3 = p.color(290, 59, 31);
    m = p.hue(vino3);
    b = p.brightness(vino3);
    s = p.saturation(vino3);
    bStep = b / 162;
    sStep = s / 162;
    p.background(0);

    // Capa de escena transparente en RGB (colores hex + alfa 0-255).
    escena = p.createGraphics(w, h);
    escena.colorMode(escena.RGB, 255);
    escena.clear();

    // Audio.
    voz = crearVoz();

    // Knobs: parte central inferior. Time (izq) y Feedback (der).
    const knobTime = new Knob(p, {
      etiqueta: "Delay time",
      min: CONFIG_DELAY.timeMin,
      max: CONFIG_DELAY.timeMax,
      valor: CONFIG_DELAY.time,
      paso: 0.01,
      onChange: (v) => {
        delayActual = v;
        if (voz) voz.delay.delayTime.rampTo(v, 0.05);
      },
    });
    knobTime.position(w / 2 - 90, h - 108);

    const knobFb = new Knob(p, {
      etiqueta: "Feedback",
      min: CONFIG_DELAY.fbMin,
      max: CONFIG_DELAY.fbMax,
      valor: CONFIG_DELAY.feedback,
      paso: 0.01,
      onChange: (v) => {
        fbActual = v;
        if (voz) voz.delay.feedback.rampTo(v, 0.05);
      },
    });
    knobFb.position(w / 2 + 22, h - 96);

    onRemove(p, () => {
      if (!voz) return;
      voz.portadora.dispose();
      voz.modulador.dispose();
      voz.modGain.dispose();
      voz.modScale.dispose();
      voz.modEnv.dispose();
      voz.vcf.dispose();
      voz.vca.dispose();
      voz.vcaEnv.dispose();
      voz.delay.dispose();
      voz.master.dispose();
    });
  };

  p.draw = () => {
    if (startMillis == null) startMillis = p.millis();

    // Avanza el fundido de fondo hasta el color objetivo y ahí se mantiene.
    if (br > b) br = b;
    if (st > s) st = s;

    // Programa los rombos de los ecos que ya "sonaron" (dibuja en la capa).
    if (triggered) procesarEcos();

    // Fondo (se repinta completo cada frame) + escena persistente encima.
    p.background(m, st, br);
    p.image(escena, 0, 0);

    if (br < b) br += bStep;
    if (st < s) st += sStep;
  };

  // Dibuja los rombos cuyo instante (n · delayTime) ya pasó desde el disparo.
  // El delay de audio genera los rebotes solo; aquí solo se refleja su timing.
  function procesarEcos() {
    const elapsedMs = p.millis() - trigTime;
    const delayMs = trigDelay * 1000;
    // Atenuación global: más tardado el sonido (mayor delayTime) → tiende a 0.
    const factorTiempo = p.map(trigDelay, CONFIG_DELAY.timeMin, CONFIG_DELAY.timeMax, 1, 0, true);
    const spread = Math.max(2, maxEcos);

    while (ecosDibujados < maxEcos) {
      const n = ecosDibujados + 1;
      if (elapsedMs < n * delayMs) break;

      // Opacidad ← volumen del feedback en el eco n (feedback^n) · factorTiempo.
      const alpha = 255 * Math.pow(trigFeedback, n ) * factorTiempo;
      // Lado alternado como el ping-pong: eco impar izquierda, par derecha.
      const lado = n % 2 === 1 ? -1 : 1;
      const x = w / 2 + lado * (w * 0.36);
      const y = p.map(n, 1, spread, h * 0.24, h * 0.8);
      const size = p.map(n, 1, spread, w * 0.085, w * 0.03);
      const col = PALETA.rombos[(n - 1) % PALETA.rombos.length];
      if (alpha > 2) dibujarRombo(x, y, size, col, alpha);
      ecosDibujados++;
    }
  }

  // Rombo (diamante) relleno con borde-glow, en la capa de escena.
  function dibujarRombo(x: number, y: number, size: number, col: string, alpha: number) {
    const pg = escena;
    pg.push();
    pg.translate(x, y);
    const relleno = pg.color(col);
    relleno.setAlpha(alpha);
    pg.noStroke();
    pg.fill(relleno);
    vertices(pg, size);
    const borde = pg.color(col);
    borde.setAlpha(Math.min(255, alpha * 0.7));
    pg.noFill();
    pg.stroke(borde);
    pg.strokeWeight(2);
    vertices(pg, size);
    pg.pop();
  }

  function vertices(pg: p5.Graphics, size: number) {
    pg.beginShape();
    pg.vertex(0, -size);
    pg.vertex(size * 0.7, 0);
    pg.vertex(0, size);
    pg.vertex(-size * 0.7, 0);
    pg.endShape(pg.CLOSE);
  }

  // Círculo central (voz principal) con halo, en la capa de escena.
  function dibujarCentro() {
    const pg = escena;
    pg.push();
    pg.translate(w / 2, h / 2);
    pg.noStroke();
    const base = pg.color(PALETA.centro);
    // Halo: varios discos concéntricos translúcidos.
    for (let i = 4; i >= 1; i--) {
      const halo = pg.color(PALETA.centro);
      halo.setAlpha(28);
      pg.fill(halo);
      pg.ellipse(0, 0, w * 0.05 * i);
    }
    base.setAlpha(255);
    pg.fill(base);
    pg.ellipse(0, 0, w * 0.05);
    pg.pop();
  }

  // Toca el canvas: dispara la campana, limpia la escena y redibuja todo.
  p.mousePressed = () => {
    if (!voz) return;
    // Congela los parámetros actuales del delay para este disparo.
    trigDelay = delayActual;
    trigFeedback = fbActual;

    // Nº de ecos visibles: hasta que el feedback^n cae por debajo de un umbral.
    maxEcos =
      trigFeedback > 0.001
        ? Math.max(1, Math.min(16, Math.ceil(Math.log(0.02) / Math.log(trigFeedback))))
        : 1;

    triggered = true;
    trigTime = p.millis();
    ecosDibujados = 0;

    // Limpia la escena y vuelve a dibujar el círculo central.
    escena.clear();
    dibujarCentro();

    // Dispara la campana (envolventes AD percusivas; sustain 0 → decaen solas).
    voz.vcaEnv.triggerAttack();
    voz.modEnv.triggerAttack();
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
  };
};
