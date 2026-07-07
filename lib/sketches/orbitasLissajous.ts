import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `Code-Package-p5.js/02_M/M_2_3_02/sketch.js`
 * (Generative Design). Renombrado "Órbitas de Lissajous" por sus órbitas
 * elípticas entrelazadas.
 *
 * Reestilizado al tema matrix del sitio: fondo oscuro y órbita en verde matrix
 * (con desvanecimiento por distancia en el modo 2). La fase `phi` se anima sola
 * de forma continua y suave, acotada a 0–360°. Un overlay de texto en naranja
 * neón muestra las frecuencias, la modulación y la fase.
 *
 * Cambios: ya venía como `function(p)`; se envuelve como factory;
 * `gd.timestamp()` → nombre estático. Se conserva la interacción: `mouseX`
 * controla el número de puntos.
 *
 * Teclas: `d` alterna modo de dibujo; `1`/`2` y `3`/`4` frecuencias X/Y; flechas
 * ←/→ empujan la fase (que ya se anima sola); `7`/`8` y `9`/`0` frecuencias de
 * modulación; `s` guarda PNG.
 */
export const orbitasLissajous: SketchFactory = (p: p5) => {
  let pointCount = 500;
  let freqX = 1;
  let freqY = 4;
  let phi = 60;
  let modFreqX = 2;
  let modFreqY = 1;
  let drawMode = 2;
  let maxDist = 0;
  let isRotating = true;
  const phaseSpeed = 0.6; // grados/frame: deriva continua y suave de la fase

  p.setup = () => {
    p.createCanvas(600, 600);
    maxDist = p.sqrt(p.sq(p.width / 2 - 50) + p.sq(p.height / 2 - 50));
  };

  p.draw = () => {
    p.background(5, 8, 5); // matrix-black
    if(isRotating) {
      phi += phaseSpeed; // la fase avanza sola cada frame
      phi = ((phi % 360) + 360) % 360; // acotada a 0–360°
    }
    p.translate(p.width / 2, p.height / 2);

    pointCount = p.mouseX * 2 + 200;

    if (drawMode === 1) {
      p.stroke(0, 255, 65); // matrix-green
      p.strokeWeight(1);
      p.fill(255, 140, 26, 50); // neon-orange, con transparencia
      p.beginShape();
      for (let i = 0; i <= pointCount; i++) {
        const angle = p.map(i, 0, pointCount, 0, p.TAU);
        const x = p.sin(angle * freqX + p.radians(phi)) * p.cos(angle * modFreqX) * (p.width / 2 - 50);
        const y = p.sin(angle * freqY) * p.cos(angle * modFreqY) * (p.height / 2 - 50);
        p.vertex(x, y);
      }
      p.endShape();
    } else {
      p.strokeWeight(8);
      let oldX = 0;
      let oldY = 0;
      for (let i = 0; i <= pointCount; i++) {
        const angle = p.map(i, 0, pointCount, 0, p.TAU);
        const x = p.sin(angle * freqX + p.radians(phi)) * p.cos(angle * modFreqX) * (p.width / 2 - 50);
        const y = p.sin(angle * freqY) * p.cos(angle * modFreqY) * (p.height / 2 - 50);

        if (i > 0) {
          const w = p.dist(x, y, 0, 0);
          p.stroke(0, 255, 65, p.map(w, 0, maxDist, 255, 0)); // matrix-green, fade por distancia
          p.line(oldX, oldY, x, y);
        }
        oldX = x;
        oldY = y;
      }
    }

    // Texto de referencia: frecuencias, modulación y fase (naranja).
    p.push();
    p.noStroke();
    p.fill(255, 140, 26); // neon-orange
    p.textSize(16);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`freqX: ${freqX}   freqY: ${freqY}`, -p.width / 2 + 12, -p.height / 2 + 12);
    p.text(`modX: ${modFreqX}   modY: ${modFreqY}`, -p.width / 2 + 12, -p.height / 2 + 32);
    p.text(`phi: ${p.nf(phi, 1, 1)}°`, -p.width / 2 + 12, -p.height / 2 + 52);
    p.pop();
  };

  p.keyPressed = () => {
    if (p.key === "p" || p.key === "P") isRotating = !isRotating;
    if (p.key === "s" || p.key === "S") p.saveCanvas("orbitas-lissajous", "png");
    if (p.key === "d" || p.key === "D") drawMode = drawMode === 1 ? 2 : 1;

    if (p.key === "1") freqX--;
    if (p.key === "2") freqX++;
    freqX = p.max(freqX, 1);

    if (p.key === "3") freqY--;
    if (p.key === "4") freqY++;
    freqY = p.max(freqY, 1);

    if (p.keyCode === p.LEFT_ARROW) phi -= 15;
    if (p.keyCode === p.RIGHT_ARROW) phi += 15;

    if (p.key === "7") modFreqX--;
    if (p.key === "8") modFreqX++;
    modFreqX = p.max(modFreqX, 1);

    if (p.key === "9") modFreqY--;
    if (p.key === "0") modFreqY++;
    modFreqY = p.max(modFreqY, 1);
  };
};
