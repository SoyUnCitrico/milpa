import { convexHull } from "@/lib/milpa/hull";
import { expandLSystem, interpretTurtle } from "@/lib/milpa/lsystem";
import type { LSystemVariant } from "@/lib/milpa/lsystem";
import { createRng } from "@/lib/milpa/random";
import type { Point, Segment } from "@/lib/milpa/spaceColonization";

/**
 * Árboles de la capa media: L-systems (reutilizando el motor de lib/milpa)
 * en 3 variantes de silueta, sembrados de forma determinista a lo largo de
 * la línea de suelo. La copa es el casco convexo de las puntas de las ramas.
 */

// Frondoso clásico: ramifica denso a ambos lados.
const ARBOL_FRONDOSO: LSystemVariant = {
  axiom: "F",
  rules: { F: "F[+F]F[-F]F" },
  iterations: 3,
  angleDeg: 22,
};

// Columnar tipo pino/ciprés: angosto y alto.
const ARBOL_COLUMNAR: LSystemVariant = {
  axiom: "F",
  rules: { F: "FF[+F][-F]" },
  iterations: 3,
  angleDeg: 32,
};

// Abierto tipo huizache: pocas ramas muy anguladas.
const ARBOL_ABIERTO: LSystemVariant = {
  axiom: "F",
  rules: { F: "F[++F][--F][+F]" },
  iterations: 3,
  angleDeg: 26,
};

const VARIANTES = [ARBOL_FRONDOSO, ARBOL_COLUMNAR, ARBOL_ABIERTO];

export interface Arbol {
  /** Posición del pie del tronco dentro del buffer. */
  x: number;
  y: number;
  /** Segmentos del árbol en coordenadas locales (pie en el origen). */
  ramas: Segment[];
  /** Silueta de copa (casco convexo de puntas profundas), coords locales. */
  copa: Point[];
  /** Profundidad máxima de rama (para graduar grosor/color). */
  maxDepth: number;
}

export interface OpcionesBosque {
  width: number;
  /** Línea de suelo alrededor de la cual se plantan (varía un poco por árbol). */
  ySuelo: number;
  seed: number | string;
  cantidad?: number;
  /** Altura aproximada del árbol más alto, en px. */
  alturaMax?: number;
}

function generarArbol(
  variante: LSystemVariant,
  altura: number,
  rng: () => number,
): { ramas: Segment[]; copa: Point[]; maxDepth: number } {
  const instrucciones = expandLSystem(variante.axiom, variante.rules, variante.iterations);
  // Nº de F consecutivos desde la raíz define cuántos pasos mide el tronco;
  // se normaliza después al alto pedido, así que el paso inicial es libre.
  const paso = 10;
  const ramas = interpretTurtle(instrucciones, {
    stepLength: paso,
    angleDeg: variante.angleDeg,
    angleJitter: 8,
    startAngleDeg: -90,
    rng,
  });

  // Normaliza al alto pedido: escala uniforme por la extensión vertical real.
  let minY = 0;
  let maxDepth = 0;
  for (const s of ramas) {
    if (s.to.y < minY) minY = s.to.y;
    if (s.depth > maxDepth) maxDepth = s.depth;
  }
  const escala = altura / Math.max(1, -minY);
  const escaladas: Segment[] = ramas.map((s) => ({
    from: { x: s.from.x * escala, y: s.from.y * escala },
    to: { x: s.to.x * escala, y: s.to.y * escala },
    depth: s.depth,
  }));

  // Copa: casco convexo SOLO de los nodos alejados de la raíz. La
  // profundidad de anidado no sirve de filtro (hay ramas anidadas que nacen
  // pegadas al suelo), así que se filtra por distancia geométrica al pie y
  // se excluye la espina del tronco (depth 0) para no encerrarlo.
  let alcance = 0;
  for (const s of escaladas) {
    const d = Math.hypot(s.to.x, s.to.y);
    if (d > alcance) alcance = d;
  }
  const umbral = alcance * 0.5;
  const puntas: Point[] = [];
  for (const s of escaladas) {
    if (s.depth >= 1 && Math.hypot(s.to.x, s.to.y) >= umbral) puntas.push(s.to);
  }
  const copa = puntas.length >= 3 ? convexHull(puntas) : [];

  return { ramas: escaladas, copa, maxDepth };
}

export function generarBosque(opts: OpcionesBosque): Arbol[] {
  const { width, ySuelo, seed, cantidad = 10, alturaMax = 260 } = opts;
  const rng = createRng(seed);
  const arboles: Arbol[] = [];

  for (let i = 0; i < cantidad; i++) {
    const variante = VARIANTES[Math.floor(rng() * VARIANTES.length)];
    const altura = alturaMax * (0.35 + rng() * 0.65);
    // Reparto horizontal con jitter, dejando algo despejado el centro
    // (ahí vive la montaña y luego la milpa).
    const franja = (i + rng()) / cantidad;
    const x = franja * width;
    const y = ySuelo + (rng() * 2 - 1) * 14 + (altura / alturaMax) * 18;
    const { ramas, copa, maxDepth } = generarArbol(variante, altura, rng);
    arboles.push({ x, y, ramas, copa, maxDepth });
  }

  return arboles;
}
