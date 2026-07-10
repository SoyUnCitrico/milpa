import type p5 from "p5";

/**
 * Una pieza en modo instancia de p5: recibe el objeto `p` y le asigna
 * los callbacks de ciclo de vida (`p.setup`, `p.draw`, etc.).
 *
 * El segundo argumento es el **constructor** de p5 (la clase), que el wrapper
 * inyecta para las piezas con audio: lo necesitan para instanciar componentes de
 * p5.sound (`new P5.Oscillator()`, `new P5.FFT()`, `P5.Vector.add(...)`). Las
 * piezas puramente visuales lo ignoran.
 *
 * El tercer argumento es el módulo de **Tone.js**, inyectado igual que `P5`
 * para las piezas de audio que ya migraron al motor Tone (ver
 * `lib/bibliotecas/cleanup.ts` para el patrón de dispose). Es una referencia
 * *type-only* (`typeof import(...)`), así que no genera un import en runtime.
 */
export type SketchFactory = (
  p: p5,
  P5?: typeof p5,
  Tone?: typeof import("tone"),
) => void;

export interface SketchControl {
  key: string;
  action: string;
}

export interface SketchMeta {
  slug: string;
  title: string;
  author: string;
  /** Ruta del sketch legacy de origen, p. ej. "p5_works/sketches/spiralOne.js". */
  source: string;
  description: string;
  tags: string[];
  controls?: SketchControl[];
  /** Si la pieza necesita audio / gesto del usuario antes de sonar. */
  needsAudio?: boolean;
  /**
   * Motor de audio que usa la pieza (solo relevante si `needsAudio`). p5.sound
   * y Tone.js no conviven bien en la misma página (ambos administran su propio
   * `AudioContext` global) — cargar el addon de p5.sound cuando la pieza en
   * realidad ya migró a Tone rompe la creación de nodos. Por defecto
   * `"p5.sound"` (piezas aún no migradas); las migradas declaran `"tone"`.
   */
  motorAudio?: "p5.sound" | "tone";
  /**
   * Póster estático para la grilla. Si se omite, se deriva del slug
   * (`sketchImageUrl`).
   */
  image?: string;
  /** Resolución lógica del canvas (se escala por CSS en pantallas chicas). */
  width: number;
  height: number;
}

export interface SketchEntry {
  meta: SketchMeta;
  factory: SketchFactory;
}
