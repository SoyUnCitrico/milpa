import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `p5_works/sketches/generativo.js`.
 *
 * Composición generativa autónoma: un patrón aleatorio de líneas ("maze") que
 * recorre el lienzo acumulándose, una cuadrícula de elipses ("grid") y un
 * cuadrado central que gira ("spin"). Pieza sin dependencias de bibliotecas.
 *
 * Se conservan las rarezas del original: `draw()` no limpia el fondo (las líneas
 * se acumulan) y `grid()` aplica `rotate(PI)` sin `push()/pop()`, por lo que la
 * matriz de transformación va girando de forma acumulada. Las subrutinas en
 * español (`maze`, `grid`, `spin`) se mantienen como funciones internas que
 * cierran sobre `p`.
 *
 * Paleta reestilizada a un duotono cyberpunk más vívido y saturado (el café
 * apagado original se oscurece hacia casi-negro, y dorado/menta/amarillo pálido
 * se empujan a neón), manteniendo la identidad cálida de la pieza original.
 *
 * Se agregan 5 círculos interactivos distribuidos en pentágono alrededor del
 * centro del lienzo. A diferencia del resto de la composición (que se acumula
 * sin limpiar fondo, rareza intencional del original), cada círculo repinta un
 * disco del color de fondo antes de dibujarse para no dejar rastro — laten
 * (radio y opacidad en `sin()`) y brillan (capas concéntricas translúcidas) de
 * forma continua, como afordancia puramente visual de "esto se puede tocar".
 * Reutilizan el sistema de clic ya existente (`mousePressed`/`mouseReleased`)
 * en vez de un estado paralelo: al mantener presionado el mouse, su núcleo
 * cambia al color de acento activo, igual que las líneas del maze y el
 * cuadrado giratorio.
 */
/** Paleta del sketch — ajustar aquí sin tocar la lógica de dibujo. */
const PALETA = {
  fondo: "#170f08", // antes #362C28 (café apagado) → café-negro más profundo y saturado
  lineas: "#ffcc00", // antes #F3C969 (dorado pálido) → dorado neón vivo
  lineasActivo: "#00ffc8", // antes #D4FCC3 (menta pálida) → turquesa neón, color de "clic activo"
  rejilla: "#e8ff00", // antes #EDFF86 (amarillo pálido) → amarillo-verde neón
  acento: "#ff682d", // nuevo: magenta/rosa neón para los círculos interactivos
};

/** Configuración de los círculos interactivos (afordancia de clic). */
const CONFIG_CIRCULOS = {
  cantidad: 5,
  radioBase: 45,
  radioPulso: 8, // amplitud del latido normal
  radioPulsoActivo: 10, // amplitud del latido al mantener clic (más evidente)
  velocidadPulso: 0.9, // Hz aproximados del latido
  capasGlow: 4,
  separacionGlow: 8, // px que crece cada capa de glow
  radioDistribucion: 0.28, // proporción del lado menor del canvas
};

export const generativo: SketchFactory = (p: p5) => {
  let x = 0;
  let y = 0;
  const gap = 20;
  let deg = 0;
  let color2 = PALETA.lineas;

  // Círculos interactivos: posiciones fijas (pentágono centrado) + fase de
  // latido individual, calculadas una sola vez en setup().
  const circulos: { x: number; y: number; fase: number }[] = [];
  let colorAcentoRGB: { r: number; g: number; b: number };

  // Cambia el color de líneas y formas al acento activo mientras se mantiene el clic.
  p.mousePressed = () => {
    color2 = PALETA.lineasActivo;
  };

  // Al soltar el clic, vuelve al color original.
  p.mouseReleased = () => {
    color2 = PALETA.lineas;
  };

  function maze() {
    // Crea un patrón aleatorio de líneas.
    p.stroke(color2);
    p.strokeWeight(2);
    if (p.random(2) < 0.5) {
      p.line(x, y, x + gap, y + gap);
    } else {
      p.line(x, y + gap, x + gap, y);
    }

    x = x + 10;
    if (x > p.width) {
      x = 0;
      y = y + gap;
    }
  }

  function grid() {
    // Crea una cuadrícula de elipses. Color y trazo son constantes en toda la
    // rejilla, así que se fijan una vez antes del loop en vez de por elipse.
    p.noStroke();
    p.fill(PALETA.rejilla);
    for (let i = 0; i < p.windowWidth; i += 45) {
      for (let j = 0; j < p.windowHeight; j += 45) {
        p.rotate(p.PI);
        p.ellipse(i, j, 20, 10);
      }
    }
  }

  function spin() {
    // Crea un cuadrado a la mitad del canvas que rota.
    p.push();
    p.scale(1);
    p.translate(p.width / 2, p.height / 2);
    p.rotate(p.radians(deg));
    deg++;
    p.fill(color2);
    p.rect(0, 0, 100, 100);
    p.pop();
  }

  function circulosInteractivos() {
    // Afordancia visual de clic: círculos que laten y brillan solos, y que
    // reaccionan al mismo mousePressed/mouseReleased que ya cambia color2.
    const t = p.millis() / 1000;
    const clicActivo = p.mouseIsPressed;
    const amplitud = clicActivo
      ? CONFIG_CIRCULOS.radioPulsoActivo
      : CONFIG_CIRCULOS.radioPulso;
    const velocidad = clicActivo
      ? CONFIG_CIRCULOS.velocidadPulso * 2.2
      : CONFIG_CIRCULOS.velocidadPulso;
    const radioMaximo =
      CONFIG_CIRCULOS.radioBase +
      amplitud +
      CONFIG_CIRCULOS.capasGlow * CONFIG_CIRCULOS.separacionGlow;

    p.noStroke();
    for (const c of circulos) {
      const pulso = p.sin(t * p.TWO_PI * velocidad + c.fase);
      const radio = CONFIG_CIRCULOS.radioBase + pulso * amplitud;
      const brillo = p.map(pulso, -1, 1, 0.5, 1);

      // Repinta un disco de fondo antes de dibujar: a diferencia del resto de
      // la pieza (que se acumula sin limpiar), estos círculos deben leerse
      // nítidos frame a frame para transmitir el latido.
      p.fill(PALETA.fondo);
      p.ellipse(c.x, c.y, (radioMaximo + 6) * 2, (radioMaximo + 6) * 2);

      // Glow: capas concéntricas translúcidas, más tenues hacia afuera.
      for (let capa = CONFIG_CIRCULOS.capasGlow; capa >= 1; capa--) {
        const radioCapa = radio + capa * CONFIG_CIRCULOS.separacionGlow;
        const alphaCapa = (brillo * 90) / (capa + 1);
        p.fill(colorAcentoRGB.r, colorAcentoRGB.g, colorAcentoRGB.b, alphaCapa);
        p.ellipse(c.x, c.y, radioCapa * 2, radioCapa * 2);
      }

      // Núcleo sólido: cambia al color de acento activo mientras hay clic,
      // igual que las líneas del maze y el cuadrado giratorio.
      p.fill(clicActivo ? PALETA.lineasActivo : PALETA.acento);
      p.ellipse(c.x, c.y, radio * 1.15, radio * 1.15);
    }
  }

  p.setup = () => {
    p.createCanvas(600, 600);
    p.background(PALETA.fondo);
    p.frameRate(60);

    const acento = p.color(PALETA.acento);
    colorAcentoRGB = { r: p.red(acento), g: p.green(acento), b: p.blue(acento) };

    // Distribución en pentágono alrededor del centro del canvas.
    const centroX = p.width / 2;
    const centroY = p.height / 2;
    const radioDist = Math.min(p.width, p.height) * CONFIG_CIRCULOS.radioDistribucion;
    for (let i = 0; i < CONFIG_CIRCULOS.cantidad; i++) {
      const angulo = -p.HALF_PI + (i * p.TWO_PI) / CONFIG_CIRCULOS.cantidad;
      circulos.push({
        x: centroX + radioDist * p.cos(angulo),
        y: centroY + radioDist * p.sin(angulo),
        fase: (i * p.TWO_PI) / CONFIG_CIRCULOS.cantidad,
      });
    }
  };

  p.draw = () => {
    
    circulosInteractivos();
    spin();
    maze();
    grid();
  };

  p.keyPressed = () => {
    // Guarda el canvas como PNG.
    if (p.key === "s" || p.key === "S") p.saveCanvas("generativo", "png");
  };
};
