// Utilidades de color y numéricas compartidas por el módulo atomosPixel.
//
// Processing expone hue()/saturation()/brightness() en escala 0..255 (Java
// Color.RGBtoHSB × 255). Aquí se implementa la misma conversión a mano para
// no depender de `colorMode(HSB)` de p5 en los bucles calientes: el análisis
// HSB se hace UNA vez por píxel al capturar, y HUECYCLE/HUESHIFT reconstruyen
// el RGB con hsbARgb sin cambiar el colorMode por partícula.

/** Equivalente a map() de Processing (sin acotar). */
export function mapear(
  v: number,
  a: number,
  b: number,
  c: number,
  d: number,
): number {
  return c + ((v - a) * (d - c)) / (b - a);
}

/** Equivalente a constrain() de Processing. */
export function acotar(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** RGB (0..255) → HSB (0..255 cada canal), como hue()/saturation()/brightness(). */
export function rgbAHsb(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const s = max === 0 ? 0 : ((max - min) / max) * 255;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 255 / 6;
  }
  return [h, s, v];
}

/** HSB (0..255 cada canal) → RGB (0..255), inversa de rgbAHsb. */
export function hsbARgb(
  h: number,
  s: number,
  v: number,
): [number, number, number] {
  const h6 = ((((h % 255) + 255) % 255) / 255) * 6;
  const i = Math.floor(h6) % 6;
  const f = h6 - Math.floor(h6);
  const sn = s / 255;
  const p = v * (1 - sn);
  const q = v * (1 - f * sn);
  const t = v * (1 - (1 - f) * sn);
  switch (i) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

/** Aleatorio uniforme en [a, b) sin pasar por p5 (para los bucles calientes). */
export function aleatorio(a: number, b: number): number {
  return a + Math.random() * (b - a);
}
