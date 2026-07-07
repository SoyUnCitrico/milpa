import type p5 from "p5";

/**
 * Una pieza en modo instancia de p5: recibe el objeto `p` y le asigna
 * los callbacks de ciclo de vida (`p.setup`, `p.draw`, etc.).
 *
 * El segundo argumento es el **constructor** de p5 (la clase), que el wrapper
 * inyecta para las piezas con audio: lo necesitan para instanciar componentes de
 * p5.sound (`new P5.Oscillator()`, `new P5.FFT()`, `P5.Vector.add(...)`). Las
 * piezas puramente visuales lo ignoran.
 */
export type SketchFactory = (p: p5, P5?: typeof p5) => void;

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
