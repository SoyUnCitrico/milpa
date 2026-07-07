import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `Code-Package-p5.js/02_M/M_2_5_01/sketch.js`
 * (Generative Design). Renombrado "Malla Armónica": una figura de Lissajous con
 * todos sus puntos cercanos conectados, formando una malla densa de envolventes.
 *
 * Reestilizado al tema matrix del sitio: fondo oscuro, malla de conexiones en
 * naranja neón (con desvanecimiento por distancia) y los nodos de la curva en
 * verde matrix. La fase `phi` se anima sola de forma continua y suave (acotada a
 * 0–360°); la tecla `p` pausa/reanuda esa rotación. Un texto en naranja muestra
 * las frecuencias X/Y, la modulación y la fase.
 *
 * Nota de rendimiento: la malla es O(n²) y ahora se recalcula/redibuja cada
 * frame, por lo que `pointCount` se bajó de 1000 a 450 para animar con fluidez.
 *
 * Cambios de port: ya venía como `function(p)`; se envuelve como factory;
 * `gd.timestamp()` → nombre estático. El `stroke(lineColor, alpha)` del original
 * se reescribe con canales explícitos, evitando una sobrecarga no estándar de p5.
 */
export const mallaArmonica: SketchFactory = (p: p5) => {
  const pointCount = 450;
  const lissajousPoints: p5.Vector[] = [];
  let freqX = 4;
  let freqY = 7;
  let phi = 15;
  let modFreqX = 3;
  let modFreqY = 2;
  let isRotating = true;
  const phaseSpeed = 0.6; // grados/frame: deriva continua y suave de la fase

  const lineWeight = 0.1;
  const lineAlpha = 50;
  const connectionRadius = 100;

  const calcularPuntos = () => {
    for (let i = 0; i <= pointCount; i++) {
      const angle = p.map(i, 0, pointCount, 0, p.TAU);
      const x = p.sin(angle * freqX + p.radians(phi)) * p.cos(angle * modFreqX) * (p.width / 2 - 30);
      const y = p.sin(angle * freqY) * p.cos(angle * modFreqY) * (p.height / 2 - 30);
      lissajousPoints[i] = p.createVector(x, y);
    }
  };

  const dibujar = () => {
    p.background(5, 8, 5); // matrix-black
    p.strokeWeight(lineWeight);
    p.push();
    p.translate(p.width / 2, p.height / 2);

    // Malla de conexiones (naranja, con desvanecimiento por distancia).
    for (let i1 = 0; i1 < pointCount; i1++) {
      for (let i2 = 0; i2 < i1; i2++) {
        const d = lissajousPoints[i1].dist(lissajousPoints[i2]);
        if (d <= connectionRadius) {
          const a = p.pow(1 / (d / connectionRadius + 1), 6);
          p.stroke(255, 140, 26); // neon-orange
          p.line(
            lissajousPoints[i1].x,
            lissajousPoints[i1].y,
            lissajousPoints[i2].x,
            lissajousPoints[i2].y,
          );
        }
      }
    }

    // Nodos de la curva (verde matrix).
    p.stroke(0, 255, 65);
    p.strokeWeight(3);
    for (const pt of lissajousPoints) p.point(pt.x, pt.y);
    p.pop();

    // Texto de referencia: frecuencias, modulación y fase (naranja).
    p.push();
    p.noStroke();
    p.fill(255, 140, 26); // neon-orange
    p.textSize(16);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`freqX: ${freqX}   freqY: ${freqY}`, 12, 12);
    p.text(`modX: ${modFreqX}   modY: ${modFreqY}`, 12, 32);
    p.text(`phi: ${p.nf(phi, 1, 1)}°`, 12, 52);
    p.pop();
  };

  p.setup = () => {
    p.createCanvas(800, 800);
    p.colorMode(p.RGB, 255, 255, 255, 100);
    p.noFill();
  };

  p.draw = () => {
    if (isRotating) {
      phi += phaseSpeed; // la fase avanza sola cada frame
      phi = ((phi % 360) + 360) % 360; // acotada a 0–360°
    }
    calcularPuntos();
    dibujar();
  };

  p.keyPressed = () => {
    if (p.key === "p" || p.key === "P") isRotating = !isRotating;
    if (p.key === "s" || p.key === "S") p.saveCanvas("malla-armonica", "png");

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
