// Atlas de glifos para la forma CHAR (ASCII/Matrix): canvas text es el cuello
// del render (fillText rasteriza el glifo en cada llamada, ×6400 partículas).
// Cada combinación (letra, tamaño cuantizado, negrita, color) se rasteriza UNA
// vez a un canvas pequeño y las partículas la pintan con drawImage (~10x más
// barato). La opacidad por brillo se aplica con globalAlpha, así el resultado
// es el mismo que el fillText original.
//
// No cubre el modo "color del píxel" (textUsePixelColor): ahí cada letra tiene
// un color distinto y el atlas explotaría; ese modo cae al fillText clásico.

export class AtlasGlifos {
  private cache = new Map<string, HTMLCanvasElement>();

  /** Canvas con el glifo rasterizado (centrado), creado bajo demanda. */
  obtener(
    glifo: string,
    px: number,
    bold: boolean,
    r: number,
    g: number,
    b: number,
  ): HTMLCanvasElement {
    const clave = `${glifo}|${px}|${bold ? 1 : 0}|${r},${g},${b}`;
    let c = this.cache.get(clave);
    if (!c) {
      // Texto arbitrario × muchos tamaños podría crecer sin límite: se vacía
      // el cache si se dispara (se repuebla solo con lo que se usa).
      if (this.cache.size > 4000) this.cache.clear();
      c = document.createElement("canvas");
      const lado = Math.max(2, Math.ceil(px * 1.6));
      c.width = lado;
      c.height = lado;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.font = `${bold ? "bold " : ""}${px}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(glifo, lado / 2, lado / 2);
      }
      this.cache.set(clave, c);
    }
    return c;
  }
}
