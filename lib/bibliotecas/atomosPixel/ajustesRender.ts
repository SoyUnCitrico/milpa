// Ajustes de render (port de RenderSettings.pde): fondo/estelas, mezcla
// aditiva, tamaño dinámico y tipografía de la forma CHAR (estilo ASCII/Matrix).
//
// Cambios respecto al original:
//  - `PFont Monospaced` → la familia CSS "monospace" + p.textStyle(BOLD) para
//    la negrita (no hay PFont en p5).
//  - `color` → tuplas [r, g, b] (el dibujo llama p.fill(r, g, b, a) directo).

import type { Forma, ModoFondo } from "./tipos";
import { FORMAS } from "./tipos";
import { acotar } from "./colorUtil";

export type ColorRGB = readonly [number, number, number];

export class AjustesRender {
  background: ModoFondo = "CLEAR";
  particleShape: Forma = "SQUARE";
  /** Alfa del velo en TRAILS (1..255; menor = estela más larga). */
  trailFade = 30;
  /** Mezcla aditiva (ADD): brillo donde se superponen. */
  additive = false;
  /** Tamaño de partícula según su velocidad. */
  dynamicSize = false;

  // --- Tipografía (forma CHAR / estilo ASCII-Matrix) ---
  monoFont = "monospace";
  /** Presets: verde Matrix, ámbar, blanco (#28FF50, #FFB000, #E6E6E6). */
  textColors: readonly ColorRGB[] = [
    [0x28, 0xff, 0x50],
    [0xff, 0xb0, 0x00],
    [0xe6, 0xe6, 0xe6],
  ];
  textColor: ColorRGB = this.textColors[0];
  /** Tamaño de la letra relativo al tamaño de celda. */
  textSizeScale = 1.3;
  /** Grosor: alterna entre normal y negrita. */
  textBold = false;
  textColorIndex = 0;

  // Modulación de la forma CHAR según el brillo del píxel:
  //   oscuro    -> charSizeDark   (grande) y charAlphaDark   (opaco)
  //   brillante -> charSizeBright (pequeño) y charAlphaBright (transparente)
  charSizeDark = 1.5;
  charSizeBright = 0.5;
  charAlphaDark = 255;
  charAlphaBright = 40;

  /** Cicla CLEAR -> TRAILS -> PERSIST -> CLEAR. */
  cycleBackground(): void {
    if (this.background === "CLEAR") this.background = "TRAILS";
    else if (this.background === "TRAILS") this.background = "PERSIST";
    else this.background = "CLEAR";
  }

  toggleAdditive(): void {
    this.additive = !this.additive;
  }

  toggleDynamicSize(): void {
    this.dynamicSize = !this.dynamicSize;
  }

  /** Cicla las formas en el orden del enum original. */
  cycleParticleShape(): void {
    const i = FORMAS.indexOf(this.particleShape);
    this.particleShape = FORMAS[(i + 1) % FORMAS.length];
  }

  /** ¿El texto usa el color original de cada píxel? (último estado del ciclo) */
  textUsePixelColor(): boolean {
    return this.textColorIndex >= this.textColors.length;
  }

  /** Ajusta la intensidad de la estela (solo afecta al modo TRAILS). */
  changeTrailFade(delta: number): void {
    this.trailFade = acotar(this.trailFade + delta, 1, 255);
  }

  /** Cicla los presets de color y un modo extra con el color de cada píxel. */
  cycleTextColor(): void {
    this.textColorIndex = (this.textColorIndex + 1) % (this.textColors.length + 1);
    if (this.textColorIndex < this.textColors.length) {
      this.textColor = this.textColors[this.textColorIndex];
    }
  }

  toggleTextBold(): void {
    this.textBold = !this.textBold;
  }

  changeTextSize(delta: number): void {
    this.textSizeScale = acotar(this.textSizeScale + delta, 0.3, 4.0);
  }
}
