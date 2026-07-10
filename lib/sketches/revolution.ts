import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Paleta en HSB (360, 100, 100, 100) — el colorMode nativo del sketch.
 * Identidad original conservada: fondo teal (matiz 168), trazo cian (173) y
 * trazo verde pálido (120). El fondo se empuja a un teal-negro más profundo y
 * saturado, y se suma un acento ámbar puntual (puntos orbitales) para el
 * duotono frío/cálido, sin copiar los tokens del sitio.
 */
const PALETA = {
  fondo: [168, 96, 12] as [number, number, number], // antes (168, 98, 25): mismo matiz, más oscuro
  trazoCian: [173, 85, 96] as [number, number, number], // antes (173, 80, 94): apenas más saturado
  matizPalido: 120, // matiz del trazo pálido; sat/brillo se modulan por ruido en paisaje()
  remate: [120, 10, 100] as [number, number, number], // antes blanco plano stroke(255): blanco con tinte verde
  acento: [32, 95, 100] as [number, number, number], // ámbar neón: puntos orbitales (acento puntual)
};

/**
 * Port en modo instancia de `creativeCode/revolution.js`.
 *
 * Arquetipo de la familia "Revolución" (ver `algorithms.md`): una línea cuyos
 * extremos recorren trayectorias circulares contrarrotantes, con grosor y
 * opacidad modulados por ruido Perlin, acumulada sobre fondo persistente.
 *
 * Pieza que termina en un frame final: cuando `angle >= TWO_PI` dibuja
 * `cuadrados()` y llama `p.noLoop()`. Los globales viven como clausura y las
 * subrutinas en español (`paisaje`, `orbitales`, `ecos`, `actualiza`,
 * `cuadrados`) cierran sobre `p`.
 */
export const revolution: SketchFactory = (p: p5) => {
  let x: number, y: number, a: number, b: number;
  let angle = 0;
  let index = 0;
  let angle2: number;
  let stepAngle: number;
  let radio: number, radioChico: number;

  p.setup = () => {
    p.createCanvas(1000, 1000);
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.background(...PALETA.fondo);
    radioChico = p.width * 0.12;
    radio = p.width * 0.45;
    stepAngle = p.TWO_PI / 360;
    angle2 = p.TWO_PI;
  };

  p.draw = () => {
    paisaje();
    orbitales();
    ecos();
    actualiza();
    if (angle >= p.TWO_PI) {
      cuadrados();
      p.noLoop();
    }
  };

  function paisaje() {
    p.push();
    p.translate(p.width / 2, p.height / 2);
    const ruido = p.noise(index);
    x = radio * p.cos(angle2);
    y = radio * p.sin(angle2);
    a = radioChico * p.cos(angle);
    b = radioChico * ruido * p.sin(angle);
    // El ruido se expone también como grosor del trazo (antes fijo en 1).
    p.strokeWeight(0.4 + ruido * 1.4);
    if (angle2 <= p.PI) {
      p.stroke(...PALETA.trazoCian, ruido * 60);
      p.line(a, b, x, y);
    } else {
      p.stroke(PALETA.matizPalido, ruido * 10 + 10, p.random(90, 95), ruido * 80 + 10);
      p.line(0, 0, x, y);
    }
    p.pop();
  }

  /**
   * Punto orbital en el extremo exterior de la línea: el ruido (con offset
   * propio) se lee directamente como tamaño del punto y como opacidad.
   * Al acumularse frame a frame graba un anillo perimetral de cuentas.
   */
  function orbitales() {
    p.push();
    p.translate(p.width / 2, p.height / 2);
    const ruido = p.noise(index + 41.3);
    p.stroke(...PALETA.acento, ruido * 70 + 10);
    p.strokeWeight(ruido * 5 + 0.5);
    p.point(x, y);
    p.pop();
  }

  /**
   * Eco interior: tick radial corto sobre un anillo intermedio, girando en
   * sentido contrario al punto orbital (usa `angle`, no `angle2`). Grosor,
   * opacidad y largo modulados por su propio offset de ruido.
   */
  function ecos() {
    p.push();
    p.translate(p.width / 2, p.height / 2);
    const ruido = p.noise(index + 87.9);
    const rInt = radio * 0.58;
    const rExt = radio * (0.58 + 0.08 * ruido);
    p.stroke(...PALETA.trazoCian, ruido * 45 + 5);
    p.strokeWeight(ruido * 2.2 + 0.3);
    p.line(rInt * p.cos(angle), rInt * p.sin(angle), rExt * p.cos(angle), rExt * p.sin(angle));
    p.pop();
  }

  function actualiza() {
    index += 0.0025;
    angle += stepAngle;
    angle2 -= stepAngle;
  }

  function cuadrados() {
    const lado = p.width * 0.07;
    for (let i = 0; i < 8; i++) {
      p.push();
      p.translate(p.width / 2, p.height / 2 );
      p.rotate((p.HALF_PI * i) / 1);
      p.translate(-p.width / 2, - p.height / 2);
      p.stroke(...PALETA.remate);
      let str = 10;
      for (let yy = 0; yy < 10; yy++) {
        p.strokeWeight(str);
        p.line(0, yy, lado, yy * 10);
        str -= 1;
      }
      p.pop();
    }
    p.push();
    p.translate(p.width / 2 - lado / 2, p.height / 2 - lado / 2);
    p.stroke(...PALETA.remate);
    let str = 10;
    for (let yy = 0; yy < 10; yy++) {
      p.strokeWeight(str);
      p.line(0, yy, lado, yy * 10);
      str -= 1;
    }
    p.pop();
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") {
      p.saveCanvas("revolution", "png");
    }
  };
};
