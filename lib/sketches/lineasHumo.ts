import type p5 from "p5";
import type { SketchFactory } from "../types";
import { AgenteHumo } from "../bibliotecas/agenteHumo";

/**
 * Port en modo instancia de `Code-Package-p5.js/02_M/M_1_5_03/sketch.js`
 * (Generative Design). Renombrado "Líneas de Humo" por sus contornos que fluyen.
 *
 * Reestilizado al tema matrix del sitio: fondo oscuro con la mayoría de agentes
 * en verde matrix y algunos destellos en naranja neón. Los agentes siguen un
 * campo de ruido Perlin 3D y trazan líneas; un rectángulo oscuro semitransparente
 * por frame va desvaneciendo el trazo. El color por-agente se fija desde el
 * sketch (la biblioteca `AgenteHumo` dibuja con el `stroke` activo).
 *
 * Interacción: click = nº de agentes (1000–5000) según `mouseX`; `1`/`2` = modo
 * de ruido; `c` = nueva semilla; borrar = limpiar; `s` = guardar PNG.
 *
 * Cambios de port: la clase `Agent` se portó a `bibliotecas/agenteHumo` (recibe
 * `p`); `windowWidth/Height` → tamaño fijo; `gd.timestamp()` → nombre estático.
 */
export const lineasHumo: SketchFactory = (p: p5) => {
  const agents: AgenteHumo[] = [];
  const agentColors: p5.Color[] = [];
  let agentCount = 4000;
  const noiseScale = 100;
  const noiseStrength = 10;
  const noiseZRange = 0.4;
  const noiseZVelocity = 0.01;
  const overlayAlpha = 10;
  const agentAlpha = 90;
  const strokeWidth = 0.3;
  let drawMode = 1;

  // (Re)genera los agentes y su color: mayoría verde matrix con leve variación de
  // brillo, ~10 % naranja neón como destello.
  const crearAgentes = () => {
    agents.length = 0;
    agentColors.length = 0;
    for (let i = 0; i < agentCount; i++) {
      agents[i] = new AgenteHumo(p, noiseZRange);
      if (p.random() < 0.1) {
        agentColors[i] = p.color(255, 140, 26, agentAlpha); // neon-orange
      } else {
        agentColors[i] = p.color(0, p.random(179, 255), 65, agentAlpha); // matrix-green
      }
    }
  };

  p.setup = () => {
    p.createCanvas(800, 800);
    p.background(5, 8, 5); // matrix-black
    crearAgentes();
  };

  p.draw = () => {
    p.fill(5, 8, 5, overlayAlpha); // matrix-black semitransparente
    p.noStroke();
    p.rect(0, 0, p.width, p.height);

    for (let i = 0; i < agents.length; i++) {
      p.stroke(agentColors[i]);
      if (drawMode === 1) {
        agents[i].update1(strokeWidth, noiseScale, noiseStrength, noiseZVelocity);
      } else {
        agents[i].update2(strokeWidth, noiseScale, noiseStrength, noiseZVelocity);
      }
    }
  };

  p.mousePressed = () => {
    agentCount = p.floor(p.map(p.mouseX, 0, p.width, 1000, 5000, true));
    crearAgentes();
    p.background(5, 8, 5); // limpia para ver el nuevo conteo
  };

  p.keyReleased = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("lineas-humo", "png");
    if (p.key === "1") drawMode = 1;
    if (p.key === "2") drawMode = 2;
    if (p.key === "c" || p.key === "C") p.noiseSeed(p.floor(p.random(10000)));
    if (p.keyCode === p.DELETE || p.keyCode === p.BACKSPACE) p.background(5, 8, 5);
  };
};
