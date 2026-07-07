import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `Code-Package-p5.js/02_M/M_1_4_01/sketch.js`
 * (Generative Design). Renombrado "Terreno de Ruido" por su malla 3D generada
 * con ruido Perlin.
 *
 * Reestilizado al tema matrix del sitio: fondo `matrix-black`, terreno coloreado
 * por altura `matrix-black → matrix-green → neon-orange` (verde de base, naranja
 * como acento en las cimas). Además se volvió una pieza **autónoma**: dos LFOs
 * senoidales a distinta frecuencia modulan el rango de ruido en X e Y (antes lo
 * hacía el arrastre izquierdo), y el terreno gira de forma continua y lenta en Z.
 *
 * Cambios de port: conversión global → instancia (prefijo `p.`); se **mantiene
 * WEBGL**; `float(width)` → `p.width`; `gd.timestamp()` → nombre estático.
 *
 * Interacción: arrastrar = inclinar/orbitar la cámara (eje X); flechas =
 * falloff/octavas; `+`/`-` = zoom; espacio = nueva semilla; `s` = guardar PNG.
 */
export const terrenoRuido: SketchFactory = (p: p5) => {
  const tileCount = 50;
  const zScale = 150;

  let noiseXRange = 10;
  let noiseYRange = 10;
  let octaves = 4;
  let falloff = 0.5;

  // LFOs senoidales que modulan el rango de ruido de forma autónoma. Las
  // frecuencias son distintas (Hz) para que X e Y "respiren" desfasados.
  const lfoFreqX = 0.03;
  const lfoFreqY = 0.047;
  const rangeMin = 4;
  const rangeMax = 16;

  // Giro continuo lento en Z (rad/frame).
  const spinSpeed = 0.004;
  let spinZ = 0;

  let midColor: p5.Color, topColor: p5.Color, bottomColor: p5.Color;
  const threshold = 0.3;

  let offsetY = 0;
  let clickY = 0;
  let zoom = -300;
  let rotationX = 0;
  let targetRotationX = 0;
  let clickRotationX = 0;

  p.setup = () => {
    p.createCanvas(600, 600, p.WEBGL);
    p.cursor(p.CROSS);

    // Paleta matrix por altura: fondo/valles negro, cuerpo verde, cimas naranja.
    bottomColor = p.color("#050805"); // matrix-black
    midColor = p.color("#00ff41"); // matrix-green
    topColor = p.color("#ff8c1a"); // neon-orange

    targetRotationX = p.PI / 3;
  };

  p.draw = () => {
    p.background("#050805"); // matrix-black

    // LFOs senoidales autónomos: cada eje modula su rango de ruido a distinta
    // frecuencia, así el relieve "respira" sin intervención del usuario.
    const t = p.millis() / 1000;
    noiseXRange = p.map(p.sin(t * p.TWO_PI * lfoFreqX), -1, 1, rangeMin, rangeMax);
    noiseYRange = p.map(p.sin(t * p.TWO_PI * lfoFreqY), -1, 1, rangeMin, rangeMax);

    p.push();
    p.translate(p.width * 0.05, p.height * 0.05, zoom);

    // Arrastrar (botón izq.) inclina/orbita la cámara en el eje X.
    if (p.mouseIsPressed && p.mouseButton === p.LEFT) {
      offsetY = p.mouseY - clickY;
      targetRotationX = p.min(
        p.max(clickRotationX + (offsetY / p.width) * p.TWO_PI, -p.HALF_PI),
        p.HALF_PI,
      );
    }
    rotationX += (targetRotationX - rotationX) * 0.25;
    spinZ += spinSpeed; // giro continuo lento en Z
    p.rotateX(rotationX);
    p.rotateZ(-spinZ);

    p.noiseDetail(octaves, falloff);
    let noiseYMax = 0;

    const tileSizeY = p.height / tileCount;
    const noiseStepY = noiseYRange / tileCount;

    for (let meshY = 0; meshY <= tileCount; meshY++) {
      p.beginShape(p.TRIANGLE_STRIP);
      for (let meshX = 0; meshX <= tileCount; meshX++) {
        const x = p.map(meshX, 0, tileCount, -p.width / 2, p.width / 2);
        const y = p.map(meshY, 0, tileCount, -p.height / 2, p.height / 2);

        const noiseX = p.map(meshX, 0, tileCount, 0, noiseXRange);
        const noiseY = p.map(meshY, 0, tileCount, 0, noiseYRange);
        const z1 = p.noise(noiseX, noiseY);
        const z2 = p.noise(noiseX, noiseY + noiseStepY);

        noiseYMax = p.max(noiseYMax, z1);
        p.colorMode(p.RGB);
        let interColor: p5.Color;
        let amount: number;
        if (z1 <= threshold) {
          amount = p.map(z1, 0, threshold, 0.15, 1);
          interColor = p.lerpColor(bottomColor, midColor, amount);
        } else {
          amount = p.map(z1, threshold, noiseYMax, 0, 1);
          interColor = p.lerpColor(midColor, topColor, amount);
        }
        p.fill(interColor);
        p.vertex(x, y, z1 * zScale);
        p.vertex(x, y + tileSizeY, z2 * zScale);
      }
      p.endShape();
    }
    p.pop();
  };

  p.mousePressed = () => {
    clickY = p.mouseY;
    clickRotationX = rotationX;
  };

  p.keyReleased = () => {
    if (p.keyCode === p.UP_ARROW) falloff += 0.05;
    if (p.keyCode === p.DOWN_ARROW) falloff -= 0.05;
    falloff = p.constrain(falloff, 0, 1);

    if (p.keyCode === p.LEFT_ARROW) octaves--;
    if (p.keyCode === p.RIGHT_ARROW) octaves++;
    if (octaves < 0) octaves = 0;

    if (p.keyCode === 187) zoom += 20; // '+'
    if (p.keyCode === 189) zoom -= 20; // '-'

    if (p.key === "s" || p.key === "S") p.saveCanvas("terreno-ruido", "png");
    if (p.key === " ") p.noiseSeed(p.floor(p.random(100000)));
  };
};
