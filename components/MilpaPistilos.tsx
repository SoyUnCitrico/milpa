import { createRng } from "@/lib/milpa/random";
import { lerpHexColor } from "@/lib/milpa/color";
import { TASSEL_VARIANT, expandLSystem, interpretTurtle } from "@/lib/milpa/lsystem";
import { round2 } from "@/lib/milpa/svg";
import MilpaReveal from "./MilpaReveal";

const WIDTH = 180;
const HEIGHT = 150;
const BOTTOM_MARGIN = -5;
// neon.amber -> neon.ember (ver tailwind.config.ts): amarillento cerca del
// tallo, más oscuro/café hacia las puntas de la espiga.
const COLOR_BASE = "#ffae42";
const COLOR_TIP = "#ff6a00";
const COLOR_BASE2 = "#5f3d10";
const COLOR_TIP2 = "#492a13";

/**
 * Pistilos de la punta de la milpa: a diferencia de las hojas (que crecen
 * hacia los extremos), esta espiga generada por L-system sí nace de abajo
 * hacia arriba, en la copa del tallo.
 */
export default function MilpaPistilos() {
  const rng = createRng("milpa-pistilos");
  const instructions = expandLSystem(
    TASSEL_VARIANT.axiom,
    TASSEL_VARIANT.rules,
    TASSEL_VARIANT.iterations,
  );
  const segments = interpretTurtle(instructions, {
    stepLength: 200,
    angleDeg: TASSEL_VARIANT.angleDeg,
    angleJitter: 25,
    startX: 0,
    startY: 150,
    startAngleDeg: -90,
    rng,
  });

  const segments2 = interpretTurtle(instructions, {
    stepLength: 150,
    angleDeg: TASSEL_VARIANT.angleDeg,
    angleJitter: 45,
    startX: -65,
    startY: 10,
    startAngleDeg: -90,
    rng,
  });

  if (segments.length === 0) return null;
  if (segments2.length === 0) return null;

  const xs = segments.flatMap((s) => [s.from.x, s.to.x]);
  const ys = segments.flatMap((s) => [s.from.y, s.to.y]);
  const reachX = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const reachY = Math.max(1, -Math.min(...ys));
  const scale = Math.min(
    (WIDTH) / reachX,
    (HEIGHT - BOTTOM_MARGIN) / reachY,
    1.5,
  );

  const anchorX = WIDTH / 2 + 20;
  const anchorY = HEIGHT - BOTTOM_MARGIN;
  const maxDepth = segments.reduce((max, s) => Math.max(max, s.depth), 1);

  return (
    <MilpaReveal
      variant="grow"
      className="pointer-events-none relative z-10 mx-auto -mb-4 justify-center sm:flex"
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-32 w-38" aria-hidden>
        <g transform={`translate(${round2(anchorX)} ${round2(anchorY)}) scale(${round2(scale)})`}>
          {segments.map((seg, i) => (
            <line
              key={i}
              x1={round2(seg.from.x)}
              y1={round2(seg.from.y)}
              x2={round2(seg.to.x)}
              y2={round2(seg.to.y)}
              stroke={lerpHexColor(COLOR_BASE, COLOR_TIP, seg.depth / maxDepth)}
              strokeWidth={round2(Math.max(0.5, 25 - seg.depth * 0.4))}
              strokeLinecap="round"
            />
          ))}
          {segments2.map((seg, i) => (
            <line
              key={i}
              x1={round2(seg.from.x)}
              y1={round2(seg.from.y)}
              x2={round2(seg.to.x)}
              y2={round2(seg.to.y)}
              stroke={lerpHexColor(COLOR_BASE2, COLOR_TIP2, seg.depth / maxDepth)}
              strokeWidth={round2(Math.max(0.2, 11 - seg.depth * 0.6))}
              strokeLinecap="round"
            />
          ))}
        </g>
      </svg>
    </MilpaReveal>
  );
}
