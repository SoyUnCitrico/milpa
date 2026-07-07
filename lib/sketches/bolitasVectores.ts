import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de
 * `Talleres2021-CC1/.../Ejemplos/CC1_ejemplo2.5._Bolita_vectores_Muchos.js`.
 *
 * Tres bolitas con posición y velocidad como `p5.Vector` rebotan dentro de una
 * frontera rectangular (invierten la componente de velocidad al tocar el borde).
 * La barra espaciadora muestra u oculta la frontera.
 *
 * Conversión global → instancia: globales a clausura, API de p5 con `p.`,
 * subrutinas en español como funciones internas, sin `.parent`.
 */
export const bolitasVectores: SketchFactory = (p: p5) => {
  let sizeBol: number, posBolita: p5.Vector, velBolita: p5.Vector;
  let sizeBol2: number, posBolita2: p5.Vector, velBolita2: p5.Vector;
  let sizeBol3: number, posBolita3: p5.Vector, velBolita3: p5.Vector;
  let initFrontera: p5.Vector, finFrontera: p5.Vector;
  let bolCol: p5.Color, bolCol2: p5.Color, bolCol3: p5.Color;
  let isBorder = true;

  const dibujaBolita = (posX: number, posY: number, sz: number, col: p5.Color) => {
    p.push();
    p.fill(col);
    p.noStroke();
    p.ellipse(posX, posY, sz);
    p.pop();
  };

  const mueveBolitas = () => {
    posBolita.add(velBolita);
    posBolita2.add(velBolita2);
    posBolita3.add(velBolita3);
  };

  const dibujarFrontera = (init: p5.Vector, end: p5.Vector) => {
    p.push();
    p.noFill();
    p.stroke(120);
    p.strokeWeight(3);
    p.rectMode(p.CORNERS);
    p.rect(init.x, init.y, end.x, end.y);
    p.pop();
  };

  const frontera = (frontIni: p5.Vector, frontFin: p5.Vector) => {
    const inicio = frontIni.copy();
    const final = frontFin.copy();

    if (posBolita.x < inicio.x || posBolita.x > final.x) velBolita.x *= -1;
    if (posBolita.y < inicio.y || posBolita.y > final.y) velBolita.y *= -1;

    if (posBolita2.x < inicio.x || posBolita2.x > final.x) velBolita2.x *= -1;
    if (posBolita2.y < inicio.y || posBolita2.y > final.y) velBolita2.y *= -1;

    if (posBolita3.x < inicio.x || posBolita3.x > final.x) velBolita3.x *= -1;
    if (posBolita3.y < inicio.y || posBolita3.y > final.y) velBolita3.y *= -1;

    if (isBorder) dibujarFrontera(inicio, final);
  };

  p.setup = () => {
    p.createCanvas(600, 600);
    p.background(220);

    sizeBol = 50;
    posBolita = p.createVector(p.width / 2, 60);
    velBolita = p.createVector(1, 2);

    sizeBol2 = 25;
    posBolita2 = p.createVector(p.width / 3, p.height - 100);
    velBolita2 = p.createVector(-5, -1);

    sizeBol3 = 10;
    posBolita3 = p.createVector(p.width / 4 + 80, 60);
    velBolita3 = p.createVector(5, 7);

    initFrontera = p.createVector(p.width / 4, 50);
    finFrontera = p.createVector((p.width * 3) / 4, p.height - 50);

    bolCol = p.color(30, 200, 220);
    bolCol2 = p.color(30, 200, 30);
    bolCol3 = p.color(200, 30, 180);
  };

  p.draw = () => {
    p.background(0);
    dibujaBolita(posBolita.x, posBolita.y, sizeBol, bolCol);
    dibujaBolita(posBolita2.x, posBolita2.y, sizeBol2, bolCol2);
    dibujaBolita(posBolita3.x, posBolita3.y, sizeBol3, bolCol3);
    mueveBolitas();
    frontera(initFrontera, finFrontera);
  };

  // La barra espaciadora muestra/oculta la frontera.
  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("bolitas-vectores", "png");
    if (p.keyCode === 32) {
      isBorder = !isBorder;
    }
  };
};
