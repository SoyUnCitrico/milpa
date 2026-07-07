import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `Code-Package-p5.js/02_M/M_2_3_01/sketch.js`
 * (Generative Design). Renombrado "Ondas Moduladas": un oscilador modulado en
 * amplitud sobre su señal portadora y la señal de información.
 *
 * Reestilizado al tema matrix del sitio: fondo negro, señal de información en
 * verde matrix, portadora en verde tenue semitransparente y la onda combinada
 * (protagonista) en naranja neón como acento. Además, la fase `phi` ahora se
 * anima sola de forma continua y suave, así la onda se desplaza sin intervención.
 *
 * Cambios: ya venía como `function(p)`; se envuelve como factory; `windowWidth`
 * → ancho fijo; `gd.timestamp()` → nombre estático.
 *
 * Teclas: `i`/`c` muestran/ocultan señales; `1`/`2` frecuencia; flechas ←/→
 * empujan la fase (que ya se anima sola); `7`/`8` frecuencia de modulación;
 * `s` guarda PNG.
 */
export const ondasModuladas: SketchFactory = (p: p5) => {
  let pointCount = 800;
  let freq = 2;
  let phi = 0;
  let modFreq = 12;
  const phaseSpeed = 0.6; // grados/frame: deriva continua y suave de la fase

  let drawFrequency = true;
  let drawModulation = true;

  p.setup = () => {
    p.createCanvas(800, 400);
    p.noFill();
    pointCount = p.width;
  };

  p.draw = () => {
    p.background(5, 8, 5); // matrix-black
    phi += phaseSpeed; // la fase avanza sola cada frame
    p.strokeWeight(1);
    p.translate(0, p.height / 2);

    // Señal de información (seno con freq y fase).
    if (drawFrequency) {
      p.stroke(0, 255, 65); // matrix-green
      p.beginShape();
      for (let i = 0; i <= pointCount; i++) {
        const angle = p.map(i, 0, pointCount, 0, p.TAU);
        const y = p.sin(angle * freq + p.radians(phi)) * (p.height / 4);
        p.vertex(i, y);
      }
      p.endShape();
    }

    // Portadora (coseno con modFreq).
    if (drawModulation) {
      p.stroke(0, 179, 65, 150); // matrix-dim, semitransparente
      p.beginShape();
      for (let i = 0; i <= pointCount; i++) {
        const angle = p.map(i, 0, pointCount, 0, p.TAU);
        const y = p.cos(angle * modFreq) * (p.height / 4);
        p.vertex(i, y);
      }
      p.endShape();

      //Texto de referencia de frecuencia y fase.
      p.push();
      p.stroke(255, 140, 26); // neon-orange
      p.textSize(16);
      p.text(`freq: ${freq}`, 10, -p.height / 2 + 20);
      p.text(`modFreq: ${modFreq}`, 10, -p.height / 2 + 40);
      p.text(`phi: ${p.nf(phi%360, 1, 1)}°`, 10, -p.height / 2 + 60);
      p.pop();  
    }

    // Combinación (modulación de amplitud).
    p.stroke(255, 140, 26); // neon-orange (señal protagonista)
    p.strokeWeight(2);
    p.beginShape();
    for (let i = 0; i <= pointCount; i++) {
      const angle = p.map(i, 0, pointCount, 0, p.TAU);
      const info = p.sin(angle * freq + p.radians(phi));
      const carrier = p.cos(angle * modFreq);
      p.vertex(i, info * carrier * (p.height / 4));
    }
    p.endShape();
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("ondas-moduladas", "png");
    if (p.key === "i" || p.key === "I") drawFrequency = !drawFrequency;
    if (p.key === "c" || p.key === "C") drawModulation = !drawModulation;

    if (p.key === "1") freq--;
    if (p.key === "2") freq++;
    freq = p.max(freq, 1);

    if (p.keyCode === p.LEFT_ARROW) phi -= 15;
    if (p.keyCode === p.RIGHT_ARROW) phi += 15;

    if (p.key === "7") modFreq--;
    if (p.key === "8") modFreq++;
    modFreq = p.max(modFreq, 1);
  };
};
