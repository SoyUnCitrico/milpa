import { createRng } from "./random";

/**
 * Colonización del espacio (Runions et al.), portado desde la lógica de
 * `pixelAtomProject/SpaceColonization.pde` (Attractor / GrowthNode con
 * `parent` / grow()) a TS genérico, sin el acoplamiento a píxeles de imagen
 * del original: los atractores se dispersan en una región según la forma
 * que se quiera crecer (abanico hacia abajo para raíces, hoja angosta en
 * base/punta para venación de hojas), en vez de sembrarse desde el brillo
 * de una foto.
 */

export type Point = { x: number; y: number };
export type Segment = { from: Point; to: Point; depth: number };

interface Attractor {
  pos: Point;
  reached: boolean;
}

interface GrowthNode {
  pos: Point;
  depth: number;
}

export interface GrowOptions {
  rootPoints: Point[];
  attractors: Point[];
  attractionDist?: number;
  killDist?: number;
  segLength?: number;
  maxSegments?: number;
}

/** Núcleo de colonización del espacio: crece nodos desde `rootPoints` hacia `attractors`. */
export function growTowardAttractors(opts: GrowOptions): Segment[] {
  const {
    rootPoints,
    attractors: attractorPoints,
    attractionDist = 55,
    killDist = 14,
    segLength = 7,
    maxSegments = 260,
  } = opts;

  const attractors: Attractor[] = attractorPoints.map((pos) => ({ pos, reached: false }));
  const nodes: GrowthNode[] = rootPoints.map((p) => ({ pos: p, depth: 0 }));
  const segments: Segment[] = [];
  const maxIterations = maxSegments * 2;

  for (let iteration = 0; iteration < maxIterations && segments.length < maxSegments; iteration++) {
    const influence = new Map<GrowthNode, { dx: number; dy: number; count: number }>();

    for (const attractor of attractors) {
      if (attractor.reached) continue;
      let nearest: GrowthNode | null = null;
      let nearestDist = attractionDist;
      for (const node of nodes) {
        const dx = attractor.pos.x - node.pos.x;
        const dy = attractor.pos.y - node.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearest = node;
          nearestDist = dist;
        }
      }
      if (!nearest) continue;
      const dx = attractor.pos.x - nearest.pos.x;
      const dy = attractor.pos.y - nearest.pos.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const acc = influence.get(nearest) ?? { dx: 0, dy: 0, count: 0 };
      acc.dx += dx / len;
      acc.dy += dy / len;
      acc.count += 1;
      influence.set(nearest, acc);
    }

    if (influence.size === 0) break;

    const newNodes: GrowthNode[] = [];
    for (const [parent, acc] of influence) {
      const dx = acc.dx / acc.count;
      const dy = acc.dy / acc.count;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const child: GrowthNode = {
        pos: {
          x: parent.pos.x + (dx / len) * segLength,
          y: parent.pos.y + (dy / len) * segLength,
        },
        depth: parent.depth + 1,
      };
      newNodes.push(child);
      segments.push({ from: parent.pos, to: child.pos, depth: child.depth });
      if (segments.length >= maxSegments) break;
    }
    nodes.push(...newNodes);

    for (const attractor of attractors) {
      if (attractor.reached) continue;
      for (const node of newNodes) {
        const dx = attractor.pos.x - node.pos.x;
        const dy = attractor.pos.y - node.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < killDist) {
          attractor.reached = true;
          break;
        }
      }
    }
  }

  return segments;
}

export interface GenerateRootsOptions {
  width: number;
  height: number;
  seed: number | string;
  /** Puntos de arranque (donde el tallo termina y empiezan las raíces). */
  rootPoints?: Point[];
  numAttractors?: number;
  attractionDist?: number;
  killDist?: number;
  segLength?: number;
  maxSegments?: number;
}

export function generateRoots(opts: GenerateRootsOptions): Segment[] {
  const {
    width,
    height,
    seed,
    rootPoints,
    numAttractors = 140,
    attractionDist = 55,
    killDist = 14,
    segLength = 7,
    maxSegments = 260,
  } = opts;

  const rng = createRng(seed);
  const starts: Point[] =
    rootPoints && rootPoints.length > 0 ? rootPoints : [{ x: width / 2, y: 0 }];

  // Atractores dispersos en un abanico que se ensancha a medida que baja,
  // como el sistema de raíces creciendo hacia afuera y hacia abajo.
  const attractors: Point[] = [];
  for (let i = 0; i < numAttractors; i++) {
    const y = rng() * height;
    const spread = (0.15 + 0.85 * (y / height)) * (width / 2);
    const x = width / 2 + (rng() * 2 - 1) * spread;
    attractors.push({ x, y });
  }

  return growTowardAttractors({
    rootPoints: starts,
    attractors,
    attractionDist,
    killDist,
    segLength,
    maxSegments,
  });
}

export interface GenerateLeafOptions {
  /** Alcance horizontal disponible, desde el borde pegado al tallo (x=0) hasta la punta. */
  width: number;
  height: number;
  seed: number | string;
  /** Puntos de arranque, pegados al tallo (x≈0). */
  rootPoints?: Point[];
  numAttractors?: number;
  attractionDist?: number;
  killDist?: number;
  segLength?: number;
  maxSegments?: number;
}

/**
 * Venación de hoja: crece desde el borde pegado al tallo (x=0) hacia el
 * extremo (x=width), en una región angosta en la base y en la punta y ancha
 * a la mitad — la silueta típica de una hoja. Siempre en dirección +x local;
 * quien la renderiza decide el lado/espejo.
 */
export function generateLeaf(opts: GenerateLeafOptions): Segment[] {
  const {
    width,
    height,
    seed,
    rootPoints,
    numAttractors = 75,
    attractionDist = 34,
    killDist = 10,
    segLength = 7,
    maxSegments = 115,
  } = opts;

  const rng = createRng(seed);
  const starts: Point[] = rootPoints && rootPoints.length > 0 ? rootPoints : [{ x: 0, y: height / 2 }];

  const attractors: Point[] = [];
  for (let i = 0; i < numAttractors; i++) {
    const t = rng();
    const x = t * width;
    const shape = 4 * t * (1 - t); // 0 en la base y la punta, máximo a la mitad
    const halfSpread = shape * (height / 2) * 0.95;
    const y = height / 2 + (rng() * 2 - 1) * halfSpread;
    attractors.push({ x, y });
  }

  return growTowardAttractors({
    rootPoints: starts,
    attractors,
    attractionDist,
    killDist,
    segLength,
    maxSegments,
  });
}
