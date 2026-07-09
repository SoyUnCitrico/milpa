import { generateLeaf } from "@/lib/milpa/spaceColonization";
import type { Point, Segment } from "@/lib/milpa/spaceColonization";
import { lerpHexColor } from "@/lib/milpa/color";
import { convexHull } from "@/lib/milpa/hull";
import { createRng } from "@/lib/milpa/random";
import { round2, smoothClosedPath } from "@/lib/milpa/svg";
import MilpaReveal from "./MilpaReveal";

const VIEW_W = 800;
const VIEW_H = 220;
const EDGE_MARGIN = -5;
const REACH = VIEW_W - EDGE_MARGIN * 2;
const PAD = 112; // margen para el grosor del trazo y el overshoot de la curva del contorno
// matrix.dim -> matrix.text (ver tailwind.config.ts).
const COLOR_BASE = "#00b341";
const COLOR_TIP = "#7fffa8";
const COLOR_BASE2 = "#104925";
const COLOR_TIP2 = "#7fffa8";

function rotatePoint(p: Point, angleRad: number, pivot: Point): Point {
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return {
    x: pivot.x + dx * Math.cos(angleRad) - dy * Math.sin(angleRad),
    y: pivot.y + dx * Math.sin(angleRad) + dy * Math.cos(angleRad),
  };
}

/**
 * Hoja de relleno generada con colonización del espacio (misma familia de
 * algoritmo que las raíces): nace pegada al tallo principal y se expande
 * hacia el extremo de la fila, inclinada hacia arriba. Las coordenadas se
 * llevan a su posición final (rotada + espejada) en JS, y el viewBox se
 * ajusta a su bounding box real — así nunca se recorta, sin importar el
 * ángulo aleatorio.
 */
export default function MilpaHoja({
  seed,
  side,
}: {
  seed: string;
  side: "left" | "right";
}) {
  const rootY = VIEW_H / 2 - 6;
  const segments = generateLeaf({
    width: REACH,
    height: VIEW_H,
    seed,
    rootPoints: [{ x: 0, y: rootY }],
    // Región mucho más ancha que la altura (el alto se mantiene fijo) — sin
    // agrandar el radio de atracción proporcionalmente, el crecimiento se
    // agota en la mitad ancha del centro y nunca alcanza la punta lejana.
    numAttractors: 200,
    attractionDist: 100,
    killDist: 20,
    segLength: 10,
    maxSegments: 240,
  });

    const segments2 = generateLeaf({
    width: REACH,
    height: VIEW_H,
    seed,
    rootPoints: [{ x: 0, y: rootY }],
    // Región mucho más ancha que la altura (el alto se mantiene fijo) — sin
    // agrandar el radio de atracción proporcionalmente, el crecimiento se
    // agota en la mitad ancha del centro y nunca alcanza la punta lejana.
    numAttractors: 200,
    attractionDist: 100,
    killDist: 20,
    segLength:30,
    maxSegments: 240,
  });

  if (segments.length === 0) return null;
  if (segments2.length === 0) return null;

  // "right" = la hoja vive en la mitad derecha de la fila → el tallo queda
  // a su izquierda → se ancla al borde izquierdo y crece hacia +x (derecha,
  // el extremo). "left" = espejo: ancla al borde derecho, crece hacia -x.
  const sign = side === "right" ? 1 : -1;
  const anchorX = side === "right" ? EDGE_MARGIN : VIEW_W - EDGE_MARGIN;

  // Inclinación hacia arriba, semilla independiente de la que usa
  // generateLeaf (para no correlacionar el ángulo con la forma de la
  // venación). rotate() en SVG (y crece hacia abajo) es horario en positivo,
  // por eso el signo negativo para inclinar hacia arriba. Pivotea en
  // (0, rootY) — el punto donde la venación nace, el más cercano al tallo.
  const tiltRng = createRng(`${seed}-tilt`);
  const tiltDeg = 20 + tiltRng() * 25;
  const angleRad = (-tiltDeg * Math.PI) / 180;
  const pivot: Point = { x: 0, y: rootY };

  function toFinal(p: Point): Point {
    const rotated = rotatePoint(p, angleRad, pivot);
    return { x: anchorX + sign * rotated.x, y: rotated.y };
  }

  const finalSegments: Segment[] = segments.map((s) => ({
    from: toFinal(s.from),
    to: toFinal(s.to),
    depth: s.depth,
  }));

    const finalSegments2: Segment[] = segments2.map((s) => ({
    from: toFinal(s.from),
    to: toFinal(s.to),
    depth: s.depth,
  }));

  const maxDepth = finalSegments.reduce((max, s) => Math.max(max, s.depth), 1);
  const maxDepth2 = finalSegments2.reduce((max, s) => Math.max(max, s.depth), 1);
  // Silueta de la hoja: casco convexo de los puntos más externos de la
  // venación (ya en coordenadas finales), suavizado.
  const hull = convexHull(finalSegments.flatMap((s) => [s.from, s.to]));
  const hull2 = convexHull(finalSegments2.flatMap((s) => [s.from, s.to]));
  const outlineD = hull.length >= 3 ? smoothClosedPath(hull) : "";
  const outlineD2 = hull2.length >= 3 ? smoothClosedPath(hull2) : "";

  // viewBox exacto: bounding box real de todos los puntos finales + margen.
  const xs = finalSegments.flatMap((s) => [s.from.x, s.to.x]);
  const ys = finalSegments.flatMap((s) => [s.from.y, s.to.y]);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const boxW = Math.max(...xs) - Math.min(...xs) + PAD * 2;
  const boxH = Math.max(...ys) - Math.min(...ys) + PAD * 2;

  const xs2 = finalSegments2.flatMap((s) => [s.from.x, s.to.x]);
  const ys2 = finalSegments2.flatMap((s) => [s.from.y, s.to.y]);
  const minX2 = Math.min(...xs2) - PAD;
  const minY2 = Math.min(...ys2) - PAD;
  const boxW2 = Math.max(...xs2) - Math.min(...xs2) + PAD * 2;
  const boxH2 = Math.max(...ys2) - Math.min(...ys2) + PAD * 2;

  const angleLeaf = Math.ceil(Math.random() * 25);
  const angleCss = side === "left" ? `rotate-[-45deg] -mx-6 mt-10` : 'rotate-[45deg] mx-12 mt-8';
  return (
    <MilpaReveal variant="grow" className="pointer-events-none">
      <svg
        viewBox={`${round2(minX)} ${round2(minY)} ${round2(boxW)} ${round2(boxH)}`}
        className="h-32 w-full scale-[2.2] sm:h-36"
        aria-hidden
      >
        {outlineD && (
          <path
            d={outlineD}
            fill={COLOR_BASE}
            fillOpacity={0.12}
            stroke={COLOR_BASE}
            strokeOpacity={0.55}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        )}
        {finalSegments.map((seg, i) => (
          <line
            key={i}
            x1={round2(seg.from.x)}
            y1={round2(seg.from.y)}
            x2={round2(seg.to.x)}
            y2={round2(seg.to.y)}
            stroke={lerpHexColor(COLOR_BASE, COLOR_TIP, seg.depth / maxDepth)}
            strokeWidth={round2(Math.max(0.4, 3.8 - seg.depth * 0.035))}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <svg
        viewBox={`${round2(minX2)} ${round2(minY2)} ${round2(boxW2)} ${round2(boxH2)}`}
        className={`h-32 w-full scale-[2.5] sm:h-36  ${angleCss}`}
        aria-hidden
      >
        {outlineD2 && (
          <path
            d={outlineD2}
            fill={COLOR_BASE2}
            fillOpacity={0.12}
            stroke={COLOR_BASE2}
            strokeOpacity={0.55}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        )}
        {finalSegments2.map((seg, i) => (
          <line
            key={i}
            x1={round2(seg.from.x)}
            y1={round2(seg.from.y)}
            x2={round2(seg.to.x)}
            y2={round2(seg.to.y)}
            stroke={lerpHexColor(COLOR_BASE2, COLOR_TIP2, seg.depth / maxDepth2)}
            strokeWidth={round2(Math.max(0.4, 3.8 - seg.depth * 0.035))}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </MilpaReveal>
  );
}
