import type p5 from "p5";
import type { SketchFactory } from "../types";
import { Colisionador } from "../bibliotecas/colisionador";
import { Cajita } from "../bibliotecas/cajita";

/**
 * Port en modo instancia de `Talleres2021-CC2/.../CC2/soundCollider.js`.
 *
 * Cajas que se desplazan y reaparecen; una sonda sigue al mouse y, al chocar con
 * una caja, dispara un drone (SqrOsc → filtro) con la nota de la caja. `mouseX`
 * barre la frecuencia de corte del filtro. Clic añade otra sonda fija.
 *
 * Reuso: `Colisionador` y `Cajita` se portaron como bibliotecas
 * (`bibliotecas/colisionador`, `bibliotecas/cajita`). El audio se desacopla con
 * el callback `onHit` de `Cajita` (el original llamaba a globales del sketch), y
 * las funciones `collideRectRect/Circle` de p5.collide2d se reimplementaron
 * dentro de `Cajita`. Usa `P5` para instanciar los componentes de p5.sound.
 */
export const soundCollider: SketchFactory = (p: p5, P5?: typeof p5) => {
  const Sound = P5 as unknown as {
    Envelope: new (...a: number[]) => any;
    Filter: new () => any;
    SqrOsc: new () => any;
  };

  const cajas: Cajita[] = [];
  const numCajas = 10;
  const bolitas: Colisionador[] = [];
  let bolita: Colisionador;
  let sliderVel: p5.Element;
  let voz: any, filtro: any, envolvente: any;
  let anteriorX = 0;

  // Al golpear una caja: afina el drone a la nota y dispara la envolvente.
  const alGolpear = (nota: number, freq: number) => {
    voz.freq(p.midiToFreq(nota));
    filtro.freq(freq);
    envolvente.play(filtro);
  };

  const addColisionador = () => {
    bolitas.push(new Colisionador(p, p.mouseX, p.mouseY, 20));
  };

  const logConv = (posicion: number, min: number, max: number, minLog: number, maxLog: number) => {
    const minv = Math.log(minLog);
    const maxv = Math.log(maxLog);
    const scale = (maxv - minv) / (max - min);
    return Math.exp(minv + scale * (posicion - min));
  };

  p.setup = () => {
    const cnv = p.createCanvas(800, 600);
    sliderVel = p.createSlider(0.1, 30, 1, 0.1);
    sliderVel.position(10, 10);
    cnv.mouseClicked(addColisionador);

    envolvente = new Sound.Envelope(0.05, 1, 0.5, 0.5, 0.2, 0);
    filtro = new Sound.Filter();
    voz = new Sound.SqrOsc();
    voz.disconnect();
    voz.connect(filtro);

    bolita = new Colisionador(p, 0, 0, 20);

    for (let i = 0; i < numCajas; i++) {
      cajas.push(
        new Cajita(
          p,
          p.random(p.width),
          p.random(p.height),
          p.random(30, 100),
          p.random(30, 100),
          i,
          alGolpear,
        ),
      );
    }

    anteriorX = p.mouseX;
  };

  p.draw = () => {
    p.background(0);
    p.push();
    p.noStroke();
    p.fill(255);
    p.text("Vel: " + String(sliderVel.value()), 50, p.height - 10);
    p.pop();

    if (anteriorX !== p.mouseX) {
      filtro.freq(logConv(p.mouseX, 0, p.width, 20, 20000));
      anteriorX = p.mouseX;
    }

    for (let i = 0; i < cajas.length; i++) {
      cajas[i].setVelocidad(sliderVel.value() as number);
      cajas[i].mostrar();
      cajas[i].revisaColision(bolita);
      for (let k = 0; k < bolitas.length; k++) {
        cajas[i].revisaColision(bolitas[k]);
      }
    }

    for (let i = 0; i < bolitas.length; i++) {
      bolitas[i].mostrar();
    }
    bolita.mostrarActual(p.mouseX, p.mouseY);
  };

  p.keyPressed = () => {
    const sw = (p.key || "").toLowerCase();
    if (sw === "g") envolvente.triggerAttack(filtro);
    if (sw === "a") voz.start();
    if (sw === "s") voz.stop();
  };

  p.keyReleased = () => {
    const sw = (p.key || "").toLowerCase();
    if (sw === "g") envolvente.triggerRelease(filtro);
  };
};
