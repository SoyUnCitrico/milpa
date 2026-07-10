import type p5 from "p5";
import { PloterFourier, PloterFinalFourier } from "../bibliotecas/ploterFourier";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de
 * `Talleres2021-CC2/.../CC2/sumador.js`.
 *
 * Suma de armónicos: una columna de epiciclos individuales (`PloterFinalFourier`,
 * un armónico cada uno, con amplitud que decae por `factor`) más, abajo, el
 * plotter que los suma todos (`PloterFourier` con la función 5). Sin audio.
 *
 * Conversión global → instancia + reuso: usa la biblioteca `ploterFourier`
 * (extendida con `PloterFinalFourier`, `changeFactor` y la función 5). El
 * limpiado de fondo lo hace este sketch (los plotters ya no lo hacen), para
 * componer las 7 gráficas en un solo canvas. Se les fija `setTimeStep(0.02)`
 * para conservar la velocidad del original sin alterar el default de
 * `spectografo`.
 */
/**
 * Neones cyberpunk (tokens del sitio) para tintar cada armónico de la columna,
 * así cada epiciclo individual se distingue del de arriba/abajo. La `figura`
 * (espirógrafo) y la `onda` de cada fila toman un color del ciclo; la estructura
 * verde y los nodos se heredan de la paleta base de `PloterFourier`.
 */
const NEONES = ["#00e5ff", "#00ff41", "#a855f7", "#ffae42", "#c98bff", "#33ff77"];

export const sumador: SketchFactory = (p: p5) => {
  const numGraficas = 6;
  const factor = 0.8;
  const amplitude = 30;

  const graficas: PloterFourier[] = [];

  p.setup = () => {
    p.createCanvas(800, 600);

    const polarInit = p.createVector(amplitude * 4, amplitude * 2);
    const timeInit = p.createVector(amplitude * 10, amplitude * 2);
    let amplitudeGraf = amplitude;

    for (let i = 0; i < numGraficas; i++) {
      const armonicos = i + 1;
      const y = polarInit.y + i * amplitude * 2.2;
      const yT = timeInit.y + i * amplitude * 2.2;
      const centroPolar = p.createVector(polarInit.x, y);
      const initGrafica = p.createVector(timeInit.x, yT);
      const grafica = new PloterFinalFourier(
        p,
        centroPolar,
        initGrafica,
        amplitudeGraf,
        armonicos,
      );
      // Cada armónico con su propio neón (figura + onda); el resto de la paleta
      // cyberpunk (estructura/nodos/eje) se hereda de PloterFourier.
      const neon = NEONES[i % NEONES.length];
      grafica.colores.figura = neon;
      grafica.colores.onda = neon;
      graficas[i] = grafica;
      amplitudeGraf = amplitudeGraf * factor;
    }

    const y = polarInit.y + numGraficas * amplitude * 2.4;
    const yT = timeInit.y + numGraficas * amplitude * 2.4;
    const centroPolar = p.createVector(polarInit.x, y);
    const initGrafica = p.createVector(timeInit.x, yT);
    const suma = new PloterFourier(p, centroPolar, initGrafica, amplitude, numGraficas);
    suma.changeFunction(5);
    suma.changeFactor(factor);
    suma.setTimeStep(0.02);
    graficas[numGraficas] = suma;
  };

  p.draw = () => {
    p.background(0);
    for (let i = 0; i < graficas.length; i++) {
      graficas[i].actualizar();
    }
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("sumador", "png");
  };
};
