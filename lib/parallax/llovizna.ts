import { createRng } from "@/lib/milpa/random";

/**
 * Llovizna generativa (capa frontal): pool FIJO de gotas en arrays planos —
 * cero allocations por frame; una gota que sale por abajo se recicla arriba.
 * La intensidad global (fade al cambiar de clima) la maneja la escena.
 */

export class Llovizna {
  private xs: Float32Array;
  private ys: Float32Array;
  private vys: Float32Array;
  private largos: Float32Array;
  private cantidad: number;
  private w: number;
  private h: number;

  constructor(cantidad: number, w: number, h: number, seed: number | string) {
    this.cantidad = cantidad;
    this.w = w;
    this.h = h;
    this.xs = new Float32Array(cantidad);
    this.ys = new Float32Array(cantidad);
    this.vys = new Float32Array(cantidad);
    this.largos = new Float32Array(cantidad);
    const rng = createRng(seed);
    for (let i = 0; i < cantidad; i++) {
      this.xs[i] = rng() * w;
      this.ys[i] = rng() * h;
      this.vys[i] = 6 + rng() * 4; // px/frame a 30 fps
      this.largos[i] = 7 + rng() * 8;
    }
  }

  redimensionar(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  /**
   * Avanza y dibuja en un solo paso (una pasada por el pool). `linea` es
   * p.line ya con stroke aplicado por la escena; `vientoDx` inclina la caída.
   */
  actualizarYDibujar(
    linea: (x1: number, y1: number, x2: number, y2: number) => void,
    vientoDx: number,
  ): void {
    const { xs, ys, vys, largos, cantidad, w, h } = this;
    for (let i = 0; i < cantidad; i++) {
      ys[i] += vys[i];
      xs[i] += vientoDx * (vys[i] / 8);
      if (ys[i] > h + largos[i]) {
        ys[i] = -largos[i];
        // Recoloca con el residuo (determinismo ya no importa aquí).
        xs[i] = (xs[i] + w * 0.37) % w;
      }
      if (xs[i] > w) xs[i] -= w;
      else if (xs[i] < 0) xs[i] += w;
      const inclinacion = vientoDx * (largos[i] / 8);
      linea(xs[i], ys[i], xs[i] + inclinacion, ys[i] + largos[i]);
    }
  }
}
