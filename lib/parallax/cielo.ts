import { lerpHexColor } from "@/lib/milpa/color";
import { createRng } from "@/lib/milpa/random";
import type { CondicionClima, PaletaCielo } from "./tipos";
import { rgba } from "./util";

/**
 * Hora del día → paleta del cielo, más el horneado de estrellas y nubes.
 * Colores propios de la escena (azules que la paleta matrix/neon no cubre);
 * donde hay parentesco con tailwind.config.ts se anota.
 */

// Azul frío de madrugada, antes de que amanezca del todo.
export const CIELO_MADRUGADA: PaletaCielo = {
  cenit: "#0b1a2e",
  horizonte: "#1c3550",
  bruma: "#2a4560",
  estrellas: 0.35,
  luzFauna: 0.3,
};

// Azul brillante de mediodía.
export const CIELO_DIA: PaletaCielo = {
  cenit: "#2e6bb0",
  horizonte: "#7fb2d9",
  bruma: "#a9c8e0",
  estrellas: 0,
  luzFauna: 1,
};

// Atardecer: horizonte encendido en neon.ember (#ff6a00, tailwind.config.ts).
export const CIELO_ATARDECER: PaletaCielo = {
  cenit: "#3a2a52",
  horizonte: "#ff6a00",
  bruma: "#a05a3c",
  estrellas: 0.1,
  luzFauna: 0.6,
};

// Noche cerrada, casi matrix.black (#050805), estrellas a tope.
export const CIELO_NOCHE: PaletaCielo = {
  cenit: "#04070d",
  horizonte: "#0a1826",
  bruma: "#13202e",
  estrellas: 1,
  luzFauna: 0,
};

/**
 * Anclas de interpolación (hora → paleta). Entre anclas consecutivas se
 * interpola campo a campo; entre dos anclas iguales (noche) la paleta se
 * mantiene constante. La lista da la vuelta al reloj (wrap a +24 h).
 */
const ANCLAS: Array<{ hora: number; paleta: PaletaCielo }> = [
  { hora: 3.5, paleta: CIELO_NOCHE },
  { hora: 5.5, paleta: CIELO_MADRUGADA },
  { hora: 10, paleta: CIELO_DIA },
  { hora: 16.5, paleta: CIELO_DIA },
  { hora: 19, paleta: CIELO_ATARDECER },
  { hora: 21, paleta: CIELO_NOCHE },
];

function lerpPaleta(a: PaletaCielo, b: PaletaCielo, t: number): PaletaCielo {
  return {
    cenit: lerpHexColor(a.cenit, b.cenit, t),
    horizonte: lerpHexColor(a.horizonte, b.horizonte, t),
    bruma: lerpHexColor(a.bruma, b.bruma, t),
    estrellas: a.estrellas + (b.estrellas - a.estrellas) * t,
    luzFauna: a.luzFauna + (b.luzFauna - a.luzFauna) * t,
  };
}

/** Paleta del cielo para una hora continua (p. ej. 18.5 = 18:30). */
export function paletaPorHora(hora: number): PaletaCielo {
  const h = ((hora % 24) + 24) % 24;
  for (let i = 0; i < ANCLAS.length; i++) {
    const actual = ANCLAS[i];
    const siguiente = ANCLAS[(i + 1) % ANCLAS.length];
    const finTramo =
      siguiente.hora > actual.hora ? siguiente.hora : siguiente.hora + 24;
    const hTramo = h >= actual.hora ? h : h + 24;
    if (hTramo >= actual.hora && hTramo < finTramo) {
      const t = (hTramo - actual.hora) / (finTramo - actual.hora);
      return lerpPaleta(actual.paleta, siguiente.paleta, t);
    }
  }
  return CIELO_NOCHE;
}

/** Hora continua actual del reloj del cliente. */
export function horaContinua(fecha = new Date()): number {
  return fecha.getHours() + fecha.getMinutes() / 60;
}

type Grafico = {
  width: number;
  height: number;
  clear: () => void;
  noStroke: () => void;
  fill: (c: string) => void;
  ellipse: (x: number, y: number, w: number, h?: number) => void;
  drawingContext: CanvasRenderingContext2D;
};

/**
 * Hornea el gradiente del cielo + estrellas en un buffer. Se llama solo al
 * regenerar (resize / cambio de franja horaria / cambio de clima), nunca por
 * frame.
 */
export function hornearCielo(
  g: Grafico,
  paleta: PaletaCielo,
  condicion: CondicionClima,
  yHorizonte: number,
): void {
  const { width: w, height: h } = g;
  g.clear();

  // Nublado aplana el gradiente: el cenit se acerca al horizonte.
  const cenit =
    condicion === "nublado"
      ? lerpHexColor(paleta.cenit, paleta.horizonte, 0.45)
      : paleta.cenit;

  const ctx = g.drawingContext;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, cenit);
  grad.addColorStop(Math.min(1, yHorizonte / h), paleta.horizonte);
  grad.addColorStop(1, lerpHexColor(paleta.horizonte, "#050805", 0.5)); // matrix.black
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Estrellas deterministas, solo visibles según paleta.estrellas (y nunca
  // con el cielo tapado por lluvia/nubes).
  const brillo = condicion === "despejado" ? paleta.estrellas : paleta.estrellas * 0.25;
  if (brillo > 0.02) {
    const rng = createRng("cielo-estrellas");
    g.noStroke();
    for (let i = 0; i < 130; i++) {
      const x = rng() * w;
      const y = rng() * yHorizonte * 0.95;
      const r = 0.6 + rng() * 1.4;
      const alfa = (0.25 + rng() * 0.7) * brillo;
      g.fill(rgba("#e8f2fa", alfa));
      g.ellipse(x, y, r, r);
    }
  }
}

/**
 * Hornea la franja de nubes en un buffer más ancho que el viewport; en draw
 * se blitea con offset que da la vuelta (wrap) para la deriva por viento,
 * sin regenerar nada.
 */
export function hornearNubes(
  g: Grafico,
  paleta: PaletaCielo,
  condicion: CondicionClima,
  semilla: string,
): void {
  const { width: w, height: h } = g;
  g.clear();

  const rng = createRng(semilla);
  const cantidad = condicion === "nublado" ? Math.round(8 * 2.5) : 8;
  const alfaBase = condicion === "nublado" ? 1.8 : 1;
  const colorNube = lerpHexColor(paleta.horizonte, "#e8f2fa", 0.55);
  const colorSombra = lerpHexColor(paleta.bruma, "#050805", 0.2); // matrix.black

  g.noStroke();
  for (let i = 0; i < cantidad; i++) {
    const cx = rng() * w;
    const cy = h * (0.15 + rng() * 0.6);
    const ancho = w * (0.06 + rng() * 0.1);
    const manchas = 6 + Math.floor(rng() * 8);
    for (let j = 0; j < manchas; j++) {
      const dx = (rng() * 2 - 1) * ancho;
      const dy = (rng() * 2 - 1) * ancho * 0.25;
      const r = ancho * (0.35 + rng() * 0.45);
      // Panza inferior en sombra, lomo superior claro.
      g.fill(rgba(dy > 0 ? colorSombra : colorNube, (0.055 + rng() * 0.085) * alfaBase));
      g.ellipse(cx + dx, cy + dy, r * 2.2, r);
    }
  }
}
