import { generateLeaf } from "@/lib/milpa/spaceColonization";
import { lerpHexColor } from "@/lib/milpa/color";
import { convexHull } from "@/lib/milpa/hull";
import { round2, smoothClosedPath } from "@/lib/milpa/svg";
import MilpaReveal from "./MilpaReveal";

const VIEW_W = 120;
const VIEW_H = 160;
const EDGE_MARGIN = -50;
const REACH = VIEW_W - EDGE_MARGIN * 2;
// matrix.dim -> matrix.text (ver tailwind.config.ts).
const COLOR_BASE = "#00b341";
const COLOR_TIP = "#7fffa8";

/**
 * Hoja de relleno generada con colonización del espacio (misma familia de
 * algoritmo que las raíces): nace pegada al tallo principal (el borde de su
 * propio viewBox que da hacia el tallo) y se expande hacia el extremo de la
 * fila, no hacia arriba.
 */
export default function MilpaHoja({
  seed,
  side,
}: {
  seed: string;
  side: "left" | "right";
}) {
  const segments = generateLeaf({
    width: REACH,
    height: VIEW_H,
    seed,
    rootPoints: [
      { x: 0, y: VIEW_H / 2 - 6 },
      { x: 0, y: VIEW_H / 2 },
      { x: 0, y: VIEW_H / 2 + 6 },
    ],
  });

  if (segments.length === 0) return null;

  // "right" = la hoja vive en la mitad derecha de la fila → el tallo queda
  // a su izquierda → se ancla al borde izquierdo del viewBox y crece hacia
  // +x (derecha, el extremo). "left" = espejo: ancla al borde derecho,
  // crece hacia -x.
  const sign = side === "right" ? 1 : -1;
  const anchorX = side === "right" ? EDGE_MARGIN : VIEW_W - EDGE_MARGIN;

  const maxDepth = segments.reduce((max, s) => Math.max(max, s.depth), 1);

  // Silueta de la hoja: casco convexo de los puntos más externos de la
  // venación, suavizado — misma <g> que las venas, así hereda el mismo
  // anclaje/espejo sin matemática extra.
  const hull = convexHull(segments.flatMap((s) => [s.from, s.to]));
  const outlineD = hull.length >= 3 ? smoothClosedPath(hull) : "";

  return (
    <MilpaReveal variant="grow" className="pointer-events-none">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-32 w-48" aria-hidden>
        <g transform={`translate(${round2(anchorX)} 0) scale(${sign} 1)`}>
          {outlineD && (
            <path
              d={outlineD}
              fill={COLOR_BASE}
              fillOpacity={0.2}
              stroke={COLOR_BASE}
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
          {segments.map((seg, i) => (
            <line
              key={i}
              x1={round2(seg.from.x)}
              y1={round2(seg.from.y)}
              x2={round2(seg.to.x)}
              y2={round2(seg.to.y)}
              stroke={lerpHexColor(COLOR_BASE, COLOR_TIP, seg.depth / maxDepth)}
              strokeWidth={round2(Math.max(0.4, 2.2 - seg.depth * 0.06))}
              strokeLinecap="round"
            />
          ))}
        </g>
      </svg>
    </MilpaReveal>
  );
}
