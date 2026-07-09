/** Utilidades mínimas de la escena parallax. */

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Hex #rrggbb + alfa 0..1 → string "rgba(...)". p5 ignora el segundo
 * argumento de fill()/stroke() cuando el color es un string, así que el alfa
 * tiene que ir dentro del propio color.
 */
export function rgba(hex: string, alfa: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp01(alfa).toFixed(3)})`;
}
