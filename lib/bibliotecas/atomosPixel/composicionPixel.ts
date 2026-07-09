// Análisis de píxeles y composiciones generativas (port de PixelData.pde +
// PixelComposer.pde): analiza la imagen en una rejilla de DatoPixel y la
// dibuja como líneas, círculos, rectángulos o un mosaico con el matiz
// desplazado. Es el equivalente "generativo" de ClusterPixel: sin física.
//
// Optimizaciones: todos los valores derivados (endpoints de línea, esquinas
// rotadas del rect, alfas) se precomputan UNA vez al construir; drawHueShift
// hace un único colorMode(HSB)/colorMode(RGB) por frame.

import type p5 from "p5";
import type { ContextoAtomos } from "./tipos";
import { mapear, rgbAHsb } from "./colorUtil";

/** Datos analizados de una celda muestreada de la imagen. */
export interface DatoPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  hue: number;
  sat: number;
  bright: number;
  // --- Precomputados de las composiciones ---
  lineDX: number; // drawLines: medio-vector de la línea
  lineDY: number;
  lineW: number;
  circDiam: number; // drawCircles
  circAlpha: number;
  quad: number[]; // drawRects: 4 esquinas rotadas (offsets)
}

export class ComposerPixel {
  private ctx: ContextoAtomos;
  datos: DatoPixel[] = [];
  cellSize: number;

  constructor(ctx: ContextoAtomos, img: p5.Image, cellSize: number) {
    this.ctx = ctx;
    this.cellSize = cellSize;
    img.loadPixels();
    const px = img.pixels;
    for (let y = 0; y < img.height; y += cellSize) {
      for (let x = 0; x < img.width; x += cellSize) {
        const loc = 4 * (x + y * img.width);
        const r = px[loc];
        const g = px[loc + 1];
        const b = px[loc + 2];
        const [hue, sat, bright] = rgbAHsb(r, g, b);

        // Línea: brillo -> longitud (y grosor); saturación -> ángulo.
        const len = mapear(bright, 0, 255, 1, cellSize * 1.8);
        const angLinea = mapear(sat, 0, 255, 0, Math.PI * 2);
        // Rect: brillo -> ancho; saturación -> alto; matiz -> ángulo.
        const rw = mapear(bright, 0, 255, 2, cellSize * 1.6) / 2;
        const rh = mapear(sat, 0, 255, 2, cellSize * 1.6) / 2;
        const angRect = mapear(hue, 0, 255, 0, Math.PI * 2);
        const c = Math.cos(angRect);
        const s = Math.sin(angRect);

        this.datos.push({
          x: x + cellSize / 2,
          y: y + cellSize / 2,
          r,
          g,
          b,
          hue,
          sat,
          bright,
          lineDX: (len / 2) * Math.cos(angLinea),
          lineDY: (len / 2) * Math.sin(angLinea),
          lineW: mapear(bright, 0, 255, 0.5, 3),
          circDiam: mapear(bright, 0, 255, 1, cellSize * 1.4),
          circAlpha: mapear(sat, 0, 255, 60, 255),
          quad: [
            -rw * c + rh * s, -rw * s - rh * c,
            rw * c + rh * s, rw * s - rh * c,
            rw * c - rh * s, rw * s + rh * c,
            -rw * c - rh * s, -rw * s + rh * c,
          ],
        });
      }
    }
  }

  /** Composición 1 — cada píxel es una línea (brillo→largo, saturación→ángulo). */
  drawLines(): void {
    const p = this.ctx.p;
    for (const d of this.datos) {
      p.stroke(d.r, d.g, d.b);
      p.strokeWeight(d.lineW);
      p.line(d.x - d.lineDX, d.y - d.lineDY, d.x + d.lineDX, d.y + d.lineDY);
    }
    p.noStroke(); // restaurar para el resto del dibujo
  }

  /** Composición 2 — cada píxel es un círculo (brillo→radio, saturación→alfa). */
  drawCircles(): void {
    const p = this.ctx.p;
    p.noStroke();
    for (const d of this.datos) {
      p.fill(d.r, d.g, d.b, d.circAlpha);
      p.ellipse(d.x, d.y, d.circDiam, d.circDiam);
    }
  }

  /**
   * Composición 3 — cada píxel es un rectángulo rotado (brillo→ancho,
   * saturación→alto, matiz→ángulo), dibujado por esquinas precomputadas.
   */
  drawRects(): void {
    const p = this.ctx.p;
    p.noStroke();
    for (const d of this.datos) {
      const q = d.quad;
      p.fill(d.r, d.g, d.b);
      p.quad(
        d.x + q[0], d.y + q[1],
        d.x + q[2], d.y + q[3],
        d.x + q[4], d.y + q[5],
        d.x + q[6], d.y + q[7],
      );
    }
  }

  /**
   * Composición 4 — recolorea la imagen desplazando el MATIZ de cada celda
   * (conserva saturación y brillo). El offset suele animarse con frameCount.
   */
  drawHueShift(offset: number): void {
    const p = this.ctx.p;
    const cell = this.cellSize;
    const half = cell / 2;
    p.noStroke();
    p.colorMode(p.HSB, 255); // un solo cambio de modo por frame
    for (const d of this.datos) {
      const nuevoHue = (d.hue + offset) % 255;
      p.fill(nuevoHue, d.sat, d.bright);
      p.rect(d.x - half, d.y - half, cell, cell);
    }
    p.colorMode(p.RGB, 255);
  }

  size(): number {
    return this.datos.length;
  }
}
