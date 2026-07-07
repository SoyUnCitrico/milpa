import type { Point } from "./spaceColonization";

/** Redondea a 2 decimales — evita hornear coordenadas con ~17 dígitos en el SVG estático. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Convierte una lista de puntos (p. ej. un casco convexo) en un `d` de
 * `<path>` cerrado y suave: spline Catmull-Rom → Bézier cúbica (loop
 * cerrado, cada punto usa sus dos vecinos a cada lado). Sin esto, unir los
 * puntos con líneas rectas se ve poligonal en vez de una silueta orgánica.
 */
export function smoothClosedPath(points: Point[]): string {
  const n = points.length;
  if (n < 3) return "";

  const at = (i: number) => points[((i % n) + n) % n];
  let d = `M ${round2(at(0).x)} ${round2(at(0).y)} `;

  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${round2(cp1x)} ${round2(cp1y)} ${round2(cp2x)} ${round2(cp2y)} ${round2(p2.x)} ${round2(p2.y)} `;
  }

  return `${d}Z`;
}
