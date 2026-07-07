import { generateRoots } from "@/lib/milpa/spaceColonization";
import { lerpHexColor } from "@/lib/milpa/color";
import { round2 } from "@/lib/milpa/svg";
import MilpaReveal from "./MilpaReveal";

const WIDTH = 900;
const HEIGHT = 260;
// matrix.glow -> matrix.line (ver tailwind.config.ts): el trazo nace vivo
// junto al tallo y se oscurece hacia las puntas, como hundiéndose en tierra.
const COLOR_NEAR = "#ff8c1a";
const COLOR_FAR = "#ffae42";

/** Base de la milpa: raíces generadas con colonización del espacio (semilla fija). */
export default function MilpaRaices() {
  const segments = generateRoots({
    width: WIDTH,
    height: HEIGHT,
    seed: "milpa-raices",
    rootPoints: [
      { x: WIDTH / 2 - 18, y: 0 },
      { x: WIDTH / 2, y: 0 },
      { x: WIDTH / 2 + 18, y: 0 },
    ],
    numAttractors: 200,
    attractionDist: 100,
    killDist: 14,
    segLength: 14,
    maxSegments: 380,
  });

  const maxDepth = segments.reduce((max, s) => Math.max(max, s.depth), 1);

  return (
    <MilpaReveal variant="slide" className="relative mx-auto w-full max-w-3xl">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[220px] w-full sm:h-[260px]"
        preserveAspectRatio="xMidYMin meet"
        aria-hidden
      >
        {segments.map((seg, i) => {
          const strokeWidth = round2(Math.max(0.6, 8 - seg.depth * 0.18));
          return (
            <line
              key={i}
              x1={round2(seg.from.x)}
              y1={round2(seg.from.y)}
              x2={round2(seg.to.x)}
              y2={round2(seg.to.y)}
              stroke={lerpHexColor(COLOR_NEAR, COLOR_FAR, seg.depth / maxDepth)}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </MilpaReveal>
  );
}
