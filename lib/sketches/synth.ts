import type p5 from "p5";
import { VCO, PWM } from "../bibliotecas/synth/vco";
import { VCF } from "../bibliotecas/synth/vcf";
import { ADSR } from "../bibliotecas/synth/adsr";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/synth.js`.
 * Sintetizador modular: dos osciladores (`VCO` + `PWM`) → filtro (`VCF`), con dos
 * envolventes (`ADSR`). Cada módulo dibuja su osciloscopio. Controles de teclado:
 * 1–4 voz del VCO, 8–0 voz del PWM, w plot onda/espectro, l lin/log, a/s y j/k
 * arrancan/paran los osciladores, t dispara la envolvente; mouse dispara ataque/
 * liberación.
 *
 * Recibe `P5` (constructor) y se lo pasa a las clases del synth para que
 * instancien los componentes de p5.sound.
 */
export const synth: SketchFactory = (p: p5, P5?: typeof p5) => {
  const Ctor = P5 as typeof p5;

  let vco1: VCO, vco2: PWM, filter: VCF;
  let adsr: ADSR, ad: ADSR;

  p.setup = () => {
    p.createCanvas(600, 600);
    p.colorMode(p.HSB);
    const posVCO = p.createVector(p.width / 2, 0);
    const posVCF = p.createVector(0, 150);
    const posADSR = p.createVector(p.width / 2, 150);
    const posAD = p.createVector(p.width / 2, 300);
    const sizeVCO = p.createVector(300, 150);
    vco1 = new VCO(p, Ctor, "sine", 440, 0.2);
    vco2 = new PWM(p, Ctor, 440, 0.2, posVCO, sizeVCO);
    filter = new VCF(p, Ctor, "lowpass", 20000, 1, posVCF, sizeVCO);
    adsr = new ADSR(p, Ctor, 0, 0.1, 0.5, 0.3, posADSR, sizeVCO);
    ad = new ADSR(p, Ctor, 0, 0, 1, 0, posAD, sizeVCO);

    vco1.unplugged();
    vco2.unplugged();
    vco1.setScreen();
    vco2.setScreen();
    filter.setScreen();
    vco1.plug(filter.getFilter());
    vco2.plug(filter.getFilter());
  };

  p.draw = () => {
    p.background(30);
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
    if (p.key === "s") vco1.oscStop();
    if (p.key === "j") vco2.oscStart();
    if (p.key === "k") vco2.oscStop();
    if (p.key === "t") adsr.play(filter.getFilter());
  };

  p.mouseClicked = () => {
    ad.triggerAD();
  };

  p.mousePressed = () => {
    adsr.triggerA(filter.getFilter());
  };

  p.mouseReleased = () => {
    adsr.triggerR(filter.getFilter());
  };
};
