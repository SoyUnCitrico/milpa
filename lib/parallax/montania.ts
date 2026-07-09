import { createRng } from "@/lib/milpa/random";
import type { Point } from "@/lib/milpa/spaceColonization";

/**
 * Silueta de montaña por midpoint displacement (fractal 1D): un pico central
 * (envolvente de campana) al que se le suma rugosidad recursiva con amplitud
 * decreciente. Determinista: misma semilla → mismo perfil.
 */

export interface OpcionesMontania {
  /** Ancho/alto del buffer donde se horneará. */
  width: number;
  height: number;
  seed: number | string;
  /** Nº de subdivisiones recursivas (7 → 129 puntos). */
  subdivisiones?: number;
  /** Altura del pico como fracción del alto disponible sobre el horizonte. */
  alturaPico?: number;
  /** Rugosidad inicial (fracción del alto), se divide entre 2 por nivel. */
  rugosidad?: number;
  /** Ancho relativo de la campana del pico (sigma de la gaussiana, 0..1). */
  anchoPico?: number;
  /** Y del horizonte dentro del buffer (la base de la silueta). */
  yHorizonte: number;
}

export interface Montania {
  /** Cresta principal, de x=0 a x=width, lista para rellenar hasta abajo. */
  principal: Point[];
  /** Cresta secundaria más baja y suave, detrás (se pinta en bruma). */
  secundaria: Point[];
}

/** Desplazamiento fractal: arreglo de 2^n+1 offsets con rugosidad decreciente. */
function desplazamientoFractal(
  subdivisiones: number,
  rugosidad: number,
  rng: () => number,
): number[] {
  const n = 2 ** subdivisiones + 1;
  const d = new Array<number>(n).fill(0);
  let paso = n - 1;
  let amplitud = rugosidad;
  while (paso > 1) {
    const mitad = paso / 2;
    for (let i = mitad; i < n; i += paso) {
      d[i] = (d[i - mitad] + d[i + mitad]) / 2 + (rng() * 2 - 1) * amplitud;
    }
    paso = mitad;
    amplitud /= 2;
  }
  return d;
}

function cresta(
  width: number,
  yHorizonte: number,
  alturaPico: number,
  anchoPico: number,
  subdivisiones: number,
  rugosidad: number,
  rng: () => number,
): Point[] {
  const d = desplazamientoFractal(subdivisiones, rugosidad, rng);
  const n = d.length;
  const puntos: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // Campana centrada: 1 en el centro, ~0 en los bordes.
    const campana = Math.exp(-(((t - 0.5) / anchoPico) ** 2));
    // La rugosidad pesa más donde hay montaña (no rompe el horizonte plano).
    const y = yHorizonte - alturaPico * campana + d[i] * (0.25 + 0.75 * campana);
    puntos.push({ x: t * width, y: Math.min(y, yHorizonte) });
  }
  return puntos;
}

export function generarMontania(opts: OpcionesMontania): Montania {
  const {
    width,
    height,
    seed,
    subdivisiones = 7,
    yHorizonte,
    alturaPico = (yHorizonte - height * 0.06) * 0.72,
    rugosidad = height * 0.05,
    anchoPico = 0.21,
  } = opts;

  const rng = createRng(seed);
  const principal = cresta(width, yHorizonte, alturaPico, anchoPico, subdivisiones, rugosidad, rng);
  // Cresta secundaria: más baja, más ancha y menos rugosa, corrida del centro.
  const secundariaCruda = cresta(
    width,
    yHorizonte,
    alturaPico * 0.55,
    anchoPico * 2.1,
    subdivisiones - 1,
    rugosidad * 0.6,
    rng,
  );
  const corrimiento = width * 0.16;
  const secundaria = secundariaCruda.map((p) => ({ x: p.x + corrimiento, y: p.y }));
  // Extiende la secundaria hasta x=0 para que no quede hueco al correrla.
  secundaria.unshift({ x: 0, y: yHorizonte });

  return { principal, secundaria };
}
