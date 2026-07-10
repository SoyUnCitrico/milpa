import { generateRoots } from "@/lib/milpa/spaceColonization";
import { lerpHexColor } from "@/lib/milpa/color";
import { round2 } from "@/lib/milpa/svg";
import MilpaReveal from "./MilpaReveal";

const WIDTH = 1200;
const HEIGHT = 380;
// matrix.glow -> matrix.line (ver tailwind.config.ts): el trazo nace vivo
// junto al tallo y se oscurece hacia las puntas, como hundiéndose en tierra.
const COLOR_NEAR = "#af6113";
const COLOR_FAR = "#c78939";

const COLOR_ROOTNEAR = "#5c350e";
const COLOR_ROOTFAR = "#b8823c";
const COLOR_ROOTNEAR_LIGHT = "#685b4e";
const COLOR_ROOTFAR_LIGHT = "#f5efe7";

/** Base de la milpa: raíces generadas con colonización del espacio (semilla fija). */
export default function MilpaRaices() {
  const segments = generateRoots({
    width: WIDTH,
    height: HEIGHT,
    seed: "milpa-raices",
    rootPoints: [
      { x: WIDTH / 2 + 24, y: 0 },
      { x: WIDTH / 2 - 24, y: 0 },
      { x: WIDTH / 2 - 18, y: 0 },
      { x: WIDTH / 2 + 18, y: 0 },
      { x: WIDTH / 2, y: 0 },
      { x: WIDTH / 2 - 36, y: 0 },
      { x: WIDTH / 2 + 36, y: 0 },
    ],
    numAttractors: 500,
    attractionDist: 200,
    killDist: 20,
    segLength: 18,
    maxSegments: 380,
  });
    const segments2 = generateRoots({
    width: WIDTH,
    height: HEIGHT,
    seed: "milpa-raices",
    rootPoints: [
      { x: WIDTH / 2 + 72, y: 0 },
      { x: WIDTH / 2 - 72, y: 0 },
      { x: WIDTH / 2 + 20, y: 0 },
      { x: WIDTH / 2 - 20, y: 0 },
      { x: WIDTH / 2 - 14, y: 0 },
      { x: WIDTH / 2 + 14, y: 0 },
      { x: WIDTH / 2, y: 0 },
      { x: WIDTH / 2 - 30, y: 0 },
      { x: WIDTH / 2 + 30, y: 0 },
    ],
    numAttractors: 800,
    attractionDist: 100,
    killDist: 20,
    segLength: 18,
    maxSegments: 380,
  });

  const segments3 = generateRoots({
    width: WIDTH,
    height: HEIGHT,
    seed: "milpa-raices",
    rootPoints: [
      { x: WIDTH / 2 + 100, y: 0 },
      { x: WIDTH / 2 - 100, y: 0 },
      { x: WIDTH / 2 + 200, y: 0 },
      { x: WIDTH / 2 - 200, y: 0 },
      { x: WIDTH / 2 - 50, y: 0 },
      { x: WIDTH / 2 + 50, y: 0 },
      { x: WIDTH / 2, y: 0 },
      { x: WIDTH / 2 - 10, y: 0 },
      { x: WIDTH / 2 + 10, y: 0 },
    ],
    numAttractors: 800,
    attractionDist: 50,
    killDist: 20,
    segLength: 10,
    maxSegments: 380,
  });

  const maxDepth = segments.reduce((max, s) => Math.max(max, s.depth), 1);

  return (
    <MilpaReveal variant="slide" className="relative mx-auto w-full max-w-3xl">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[360px] w-full sm:h-[260px]"
        preserveAspectRatio="xMidYMin meet"
        aria-hidden
      >
          {segments.map((seg, i) => {
            const strokeWidth = round2(Math.max(0.8, 18 - seg.depth * 0.607));
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
          {segments2.map((seg, i) => {
            const strokeWidth = round2(Math.max(0.8, 8 - seg.depth * 0.17));
            return (
              <line
                key={i}
                x1={round2(seg.from.x)}
                y1={round2(seg.from.y)}
                x2={round2(seg.to.x)}
                y2={round2(seg.to.y)}
                stroke={lerpHexColor(COLOR_ROOTNEAR, COLOR_ROOTFAR, seg.depth / maxDepth)}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          })}

          {segments3.map((seg, i) => {
            const strokeWidth = round2(Math.max(0.8,4 - seg.depth * 0.07));
            return (
              <line
                key={i}
                x1={round2(seg.from.x)}
                y1={round2(seg.from.y)}
                x2={round2(seg.to.x)}
                y2={round2(seg.to.y)}
                stroke={lerpHexColor(COLOR_ROOTNEAR_LIGHT, COLOR_ROOTFAR_LIGHT, seg.depth / maxDepth)}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          })}
      </svg>
    </MilpaReveal>
  );
}
