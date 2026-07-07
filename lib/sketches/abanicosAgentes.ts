import type p5 from "p5";
import type { SketchFactory } from "../types";
import { AgenteAbanico } from "../bibliotecas/agenteAbanico";

/**
 * Port en modo instancia de `Code-Package-p5.js/02_M/M_1_5_04/sketch.js`
 * (Generative Design). Renombrado "Abanicos de Agentes" por sus pinceladas en
 * abanico.
 *
 * Reestilizado al tema matrix del sitio: fondo oscuro con la mayoría de agentes
 * en verde matrix y algunos destellos en naranja neón. El color por-agente se
 * fija desde el sketch, sobrescribiendo el `this.color` teal/oro de la biblioteca
 * `AgenteAbanico` (que lo aplica con su propio `p.stroke`). Los agentes siguen un
 * campo de ruido y dibujan un trazo perpendicular (estilo 1) o elipses (estilo 2).
 *
 * Interacción: click = nº de agentes (1000–5000) según `mouseX`; `1`/`2` = estilo
 * de trazo; `c` = nueva semilla; borrar = limpiar; `s` = guardar PNG.
 *
 * Cambios de port: la clase `Agent` se portó a `bibliotecas/agenteAbanico`
 * (recibe `p`); `windowWidth/Height` → tamaño fijo; `gd.timestamp()` → nombre
 * estático.
 */
export const abanicosAgentes: SketchFactory = (p: p5) => {
  const agents: AgenteAbanico[] = [];
  let agentCount = 2000;
  const noiseScale = 100;
  const noiseStrength = 10;
  const noiseStickingRange = 0.4;
  const zNoiseVelocity = 0.01;
  const overlayAlpha = 8;
  const agentAlpha = 90;
  const strokeWidth = 2;
  const agentWidthMin = 1.5;
  const agentWidthMax = 15;
  let drawMode = 1;

  // (Re)genera los agentes y sobrescribe su color: mayoría verde matrix con leve
  // variación de brillo, ~10 % naranja neón como destello.
  const crearAgentes = () => {
    agents.length = 0;
    for (let i = 0; i < agentCount; i++) {
      const a = new AgenteAbanico(
        p,
        noiseStickingRange,
        agentAlpha,
        noiseScale,
        noiseStrength,
        strokeWidth,
        agentWidthMin,
        agentWidthMax,
        zNoiseVelocity,
      );
      a.color =
        p.random() < 0.1
          ? p.color(31, 90, 100, agentAlpha) // neon-orange
          : p.color(135, 100, p.random(70, 100), agentAlpha); // matrix-green
      agents.push(a);
    }
  };

  p.setup = () => {
    p.createCanvas(800, 800);
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.background(135, 40, 3); // matrix-black
    crearAgentes();
  };

  p.draw = () => {
    p.fill(135, 40, 3, overlayAlpha); // matrix-black semitransparente
    p.noStroke();
    p.rect(0, 0, p.width, p.height);

    for (const agente of agents) {
      if (drawMode === 1) {
        agente.update1();
      } else if (drawMode === 2) {
        agente.update2();
      } else {
        agente.update3();
      }
    }
  };

  p.mousePressed = () => {
    agentCount = p.floor(p.map(p.mouseX, 0, p.width, 1000, 5000, true));
    crearAgentes();
    p.background(135, 40, 3); // limpia para ver el nuevo conteo
  };

  p.keyReleased = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("abanicos-agentes", "png");
    if (p.key === "1") drawMode = 1;
    if (p.key === "2") drawMode = 2;
    if (p.key === "3") drawMode = 3;
    if (p.key === "c" || p.key === "C") p.noiseSeed(p.floor(p.random(10000)));
    if (p.keyCode === p.DELETE || p.keyCode === p.BACKSPACE) p.background(135, 40, 3);
  };
};
