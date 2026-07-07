import type { Point, Segment } from "./spaceColonization";

/**
 * L-system + intérprete turtle genérico. No hay precedente en el monorepo
 * (ni L-system ni turtle graphics existían) — motor escrito desde cero.
 */

export interface LSystemVariant {
  axiom: string;
  rules: Record<string, string>;
  iterations: number;
  angleDeg: number;
}

/** Pistilos/espiga de la punta de la milpa: manojo angosto de espigas que se abre en abanico. */
export const TASSEL_VARIANT: LSystemVariant = {
  axiom: "F",
  rules: { F: "F[+F][-F][++F][--F]" },
  iterations: 3,
  angleDeg: 9,
};

export function expandLSystem(
  axiom: string,
  rules: Record<string, string>,
  iterations: number,
): string {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of current) next += rules[ch] ?? ch;
    current = next;
  }
  return current;
}

export interface InterpretTurtleOptions {
  stepLength: number;
  angleDeg: number;
  /** Jitter aleatorio (grados) aplicado al trazo de cada F, sin acumularse en el rumbo. */
  angleJitter?: number;
  startX?: number;
  startY?: number;
  /** 0 = apunta a +x; -90 = apunta hacia arriba (y crece hacia abajo en SVG). */
  startAngleDeg?: number;
  rng: () => number;
}

interface TurtleState {
  pos: Point;
  angle: number;
  depth: number;
}

export function interpretTurtle(
  instructions: string,
  opts: InterpretTurtleOptions,
): Segment[] {
  const {
    stepLength,
    angleDeg,
    angleJitter = 0,
    startX = 0,
    startY = 0,
    startAngleDeg = -90,
    rng,
  } = opts;

  const segments: Segment[] = [];
  const angleStep = (angleDeg * Math.PI) / 180;
  let state: TurtleState = {
    pos: { x: startX, y: startY },
    angle: (startAngleDeg * Math.PI) / 180,
    depth: 0,
  };
  const stack: TurtleState[] = [];

  for (const ch of instructions) {
    if (ch === "F") {
      const jitterRad = angleJitter
        ? ((rng() * 2 - 1) * angleJitter * Math.PI) / 180
        : 0;
      const drawAngle = state.angle + jitterRad;
      const next: Point = {
        x: state.pos.x + Math.cos(drawAngle) * stepLength,
        y: state.pos.y + Math.sin(drawAngle) * stepLength,
      };
      segments.push({ from: state.pos, to: next, depth: state.depth });
      state = { ...state, pos: next };
    } else if (ch === "+") {
      state = { ...state, angle: state.angle + angleStep };
    } else if (ch === "-") {
      state = { ...state, angle: state.angle - angleStep };
    } else if (ch === "[") {
      stack.push(state);
      state = { ...state, depth: state.depth + 1 };
    } else if (ch === "]") {
      state = stack.pop() ?? state;
    }
  }

  return segments;
}
