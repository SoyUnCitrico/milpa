import type p5 from "p5";
import type * as Tone from "tone";
import { VCO, PWM } from "../bibliotecas/synth/vco";
import { VCF } from "../bibliotecas/synth/vcf";
import { ADSR } from "../bibliotecas/synth/adsr";
import { onRemove } from "../bibliotecas/cleanup";
import type { SketchFactory } from "../types";

/** Paleta del sketch — ajustar aquí sin tocar la lógica de dibujo. */
const PALETA = {
  fondo: "#0d0d16",
  trazoOnda: "#33ff77", // antes stroke(100,255,255) cian → verde neón
  trazoEspectro: "#ff8c1a", // antes barrido arcoíris HSB → naranja neón monocromo
};

/** Parámetros por defecto del synth — modificar aquí, no en la lógica. */
const CONFIG_SYNTH = {
  vco1: { tipo: "sine" as OscillatorType, freq: 440, vol: 0.2 },
  vco2: { freq: 440, vol: 0.2 },
  filtro: { tipo: "lowpass" as BiquadFilterType, freq: 20000, resonancia: 1 },
  adsr: { attack: 0, decay: 0.1, sustain: 0.5, release: 0.3 },
  ad: { attack: 0, decay: 0, sustain: 1, release: 0 },
};

/**
 * Port en modo instancia de `creativeCode/synth.js`.
 * Sintetizador modular: dos osciladores (`VCO` + `PWM`) → filtro (`VCF`), con dos
 * envolventes (`ADSR`). Cada módulo dibuja su osciloscopio. Controles de teclado:
 * 1–4 voz del VCO, 8–0 voz del PWM, w plot onda/espectro, l lin/log, a/x y j/k
 * arrancan/paran los osciladores, t dispara la envolvente; mouse dispara ataque/
 * liberación.
 *
 * Migrado de `p5.sound` a **Tone.js** (inyectado como 3er argumento de la
 * factory por `P5Sketch.tsx`). Cadena de señal: vco1/vco2 → filtro → gain de
 * `adsr` → gain de `ad` → `Tone.Destination`. Todos los nodos se disponen al
 * desmontar vía `onRemove` (ver `lib/bibliotecas/cleanup.ts`) — ver notas de
 * aproximación de disparo en `lib/bibliotecas/synth/adsr.ts`.
 */
export const synth: SketchFactory = (p: p5, _P5?: typeof p5, ToneModule?: typeof Tone) => {
  const T = ToneModule as typeof Tone;

  let vco1: VCO, vco2: PWM, filter: VCF;
  let adsr: ADSR, ad: ADSR;

  p.setup = () => {
    p.createCanvas(600, 600);
    const colores = { onda: PALETA.trazoOnda, espectro: PALETA.trazoEspectro };
    const posVCO = p.createVector(p.width / 2, 0);
    const posVCF = p.createVector(0, 150);
    const posADSR = p.createVector(p.width / 2, 150);
    const posAD = p.createVector(p.width / 2, 300);
    const sizeVCO = p.createVector(300, 150);

    vco1 = new VCO(p, T, CONFIG_SYNTH.vco1.tipo, CONFIG_SYNTH.vco1.freq, CONFIG_SYNTH.vco1.vol, undefined, undefined, colores);
    vco2 = new PWM(p, T, CONFIG_SYNTH.vco2.freq, CONFIG_SYNTH.vco2.vol, posVCO, sizeVCO, colores);
    filter = new VCF(p, T, CONFIG_SYNTH.filtro.tipo, CONFIG_SYNTH.filtro.freq, CONFIG_SYNTH.filtro.resonancia, posVCF, sizeVCO, colores);
    adsr = new ADSR(p, T, CONFIG_SYNTH.adsr.attack, CONFIG_SYNTH.adsr.decay, CONFIG_SYNTH.adsr.sustain, CONFIG_SYNTH.adsr.release, posADSR, sizeVCO, colores);
    ad = new ADSR(p, T, CONFIG_SYNTH.ad.attack, CONFIG_SYNTH.ad.decay, CONFIG_SYNTH.ad.sustain, CONFIG_SYNTH.ad.release, posAD, sizeVCO, colores);

    vco1.setScreen();
    vco2.setScreen();
    filter.setScreen();
    vco1.plug(filter.getFilter());
    vco2.plug(filter.getFilter());
    filter.plug(adsr.getGain());
    adsr.plug(ad.getGain());
    ad.plug(T.Destination);

    onRemove(p, () => {
      vco1.dispose();
      vco2.dispose();
      filter.dispose();
      adsr.dispose();
      ad.dispose();
    });
  };

  p.draw = () => {
    p.background(PALETA.fondo);
    vco1.dibuja();
    vco2.dibuja();
    filter.dibuja();
    adsr.dibuja();
    ad.dibujaAD();
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
      vco2.changeMode();
      vco1.changeMode();
      filter.changeMode();
    }

    if (p.key === "a") vco1.oscStart();
    if (p.key === "x") vco1.oscStop(); // antes 's' — liberada para guardar canvas
    if (p.key === "j") vco2.oscStart();
    if (p.key === "k") vco2.oscStop();
    if (p.key === "t") adsr.play();

    if (p.key === "s" || p.key === "S") p.saveCanvas("synth", "png");
  };

  p.mouseClicked = () => {
    ad.triggerAD();
  };

  p.mousePressed = () => {
    adsr.triggerA();
  };

  p.mouseReleased = () => {
    adsr.triggerR();
  };
};
