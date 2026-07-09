// Tipos y constantes del módulo atomosPixel (port de pixelAtomProject).
//
// Los enums de Processing (AnimationMode, ParticleShape, BackgroundMode) y los
// strings mágicos de límites/barrido se convierten en union types + tablas
// `as const`. El "estado global" del sketch original vive en ContextoAtomos:
// la factory lo crea y lo comparte con todas las clases del módulo.

import type p5 from "p5";
import type { AjustesRender } from "./ajustesRender";
import type { EstadoApp } from "./estadoApp";
import type { ConfigAtomos } from "./configuracion";
import type { Repulsor } from "./repulsor";
import type { ClusterPixel } from "./clusterPixel";
import type { CampoFlujo } from "./campoFlujo";
import type { ComposerPixel } from "./composicionPixel";
import type { Colonizacion } from "./colonizacion";

/** Forma con la que se dibuja cada átomo (ParticleShape). */
export type Forma =
  | "SQUARE"
  | "ELLIPSE"
  | "LINE"
  | "CIRCLE"
  | "RECT"
  | "CHAR"
  | "TRIANGLE"
  | "HUESQUARE"
  | "HUECYCLE";

/** Orden del ciclo de formas (tecla `s`), igual que el enum original. */
export const FORMAS: readonly Forma[] = [
  "SQUARE",
  "ELLIPSE",
  "LINE",
  "CIRCLE",
  "RECT",
  "CHAR",
  "TRIANGLE",
  "HUESQUARE",
  "HUECYCLE",
];

/** Cómo se limpia el canvas entre frames (BackgroundMode). */
export type ModoFondo = "CLEAR" | "TRAILS" | "PERSIST";

/** Comportamiento en los bordes del canvas (checkLimits). */
export type Limite = "OTHERSIDE" | "REVERSE_X" | "REVERSE_Y" | "REVERSE_XY";

/** Dirección del barrido tipo lluvia (modo SWEEP). */
export type Barrido = "LEFT" | "RIGHT" | "UP" | "DOWN";

/** Identidad de cada modo: la tecla que lo activa y su etiqueta (AnimationMode). */
export const MODOS = {
  ORIGINAL: { key: "1", label: "Modo original" },
  MOUSE: { key: "2", label: "Seguir mouse" },
  FIELD: { key: "3", label: "Atravesar campo" },
  WALK: { key: "4", label: "Deambular" },
  SWEEP: { key: "5", label: "Barrer" },
  SHAKE: { key: "6", label: "Temblar" },
  FLOCK: { key: "7", label: "Manada" },
  VORTEX: { key: "8", label: "Vórtice" },
  EXPLODE: { key: "9", label: "Explosión" },
  GRAVITY: { key: "0", label: "Gravedad al mouse" },
  LINES: { key: "w", label: "Composición: líneas" },
  CIRCLES: { key: "o", label: "Composición: círculos" },
  RECTS: { key: "x", label: "Composición: rectángulos" },
  HUESHIFT: { key: "h", label: "Composición: desplazar matiz" },
  COLONIZE: { key: "a", label: "Colonización de espacios" },
} as const;

export type Modo = keyof typeof MODOS;

/** Modos en el orden de declaración (para selección por índice 1..N). */
export const LISTA_MODOS = Object.keys(MODOS) as readonly Modo[];

/** Devuelve el modo asociado a una tecla, o null (modeForKey del original). */
export function modoPorTecla(k: string): Modo | null {
  for (const m of LISTA_MODOS) {
    if (MODOS[m].key === k) return m;
  }
  return null;
}

/** Vector 2D plano (sin p5.Vector) para el estado caliente de las partículas. */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Contexto compartido del sketch: reemplaza los globales de Processing
 * (state, render, img, cluster, campo, composer, colonizer, repulsors...).
 * La factory lo crea en setup() y lo pasa a todas las clases.
 */
export interface ContextoAtomos {
  p: p5;
  /** Dimensiones lógicas del canvas (width/height del sketch original). */
  W: number;
  H: number;
  render: AjustesRender;
  state: EstadoApp;
  config: ConfigAtomos;
  repulsors: Repulsor[];
  img: p5.Image | null;
  cluster: ClusterPixel | null;
  campo: CampoFlujo | null;
  composer: ComposerPixel | null;
  colonizer: Colonizacion | null;
  /** Texto que "escriben" las partículas en forma CHAR ("" = ASCII por brillo). */
  asciiText: string;
  // --- Parámetros de la colonización de espacios (ajustables en vivo) ---
  colonizeThreshold: number;
  colonizeAttraction: number;
  colonizeKill: number;
  colonizeSeg: number;
}
