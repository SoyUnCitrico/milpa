import type p5 from "p5";
import { PloterFourier } from "../bibliotecas/ploterFourier";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/spectografo.js`.
 * Visualizador de series de Fourier: dibuja epiciclos (espirógrafo) y la onda
 * resultante en el tiempo. Tres sliders controlan armónicos, amplitud y paso de
 * tiempo; las teclas 1/2/3 cambian entre onda triangular, cuadrada y de sierra.
 * Sin audio.
 */
export const spectografo: SketchFactory = (p: p5) => {
  const amplitude = 0;
  const armonicos = 1;
  let grafica: PloterFourier;
  let sliderArm: p5.Element, sliderAmp: p5.Element, sliderTime: p5.Element;

  p.setup = () => {
    p.createCanvas(800, 500);
    const centroCirculo = p.createVector(p.width * 0.2, p.height * 0.5);
    const inicioGrafica = p.createVector(p.width * 0.5, p.height * 0.5);
    grafica = new PloterFourier(p, centroCirculo, inicioGrafica, amplitude, armonicos);

    // Los sliders verticales (rotados 270°) se posicionan en coordenadas del
    // canvas, separados a lo largo del borde inferior izquierdo para que no se
    // apilen (el original no los posicionaba y quedaban encimados).
    sliderArm = p.createSlider(1, 30, 1, 1);
    sliderArm.style("transform: rotate(270deg)");
    sliderArm.position(20, p.height - 130);

    sliderAmp = p.createSlider(0, 100, 0, 1);
    sliderAmp.style("transform: rotate(270deg)");
    sliderAmp.position(75, p.height - 130);

    sliderTime = p.createSlider(0.008, 0.08, 0.001, 0.0001);
    sliderTime.style("transform: rotate(270deg)");
    sliderTime.position(130, p.height - 130);
  };

  p.draw = () => {
    // El fondo se limpia aquí (antes lo hacía PloterFourier.actualizar).
    p.background(0);
    grafica.setArmonicos(sliderArm.value() as number);
    grafica.setAmp(sliderAmp.value() as number);
    grafica.setTimeStep(sliderTime.value() as number);
    grafica.actualizar();
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("spectografo", "png");
    if (p.key === "1") grafica.changeFunction(1);
    if (p.key === "2") grafica.changeFunction(2);
    if (p.key === "3") grafica.changeFunction(3);
  };
};
