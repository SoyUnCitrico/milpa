"use client";

import { useEffect, useRef, useState } from "react";
import { generateFrijol } from "@/lib/milpa/frijol";
import type { Enredadera, PuntaFrijol } from "@/lib/milpa/frijol";
import { lerpHexColor } from "@/lib/milpa/color";
import { round2 } from "@/lib/milpa/svg";

/**
 * Enredaderas de frijol trepando el tallo central + el propio tallo. El tallo
 * vivía como <div> suelto en page.tsx; ahora se renderiza aquí, en medio de
 * dos capas SVG (detrás/delante), para que la enredadera se enrede de verdad:
 * los tramos con fase trasera de la hélice quedan bajo el tallo y los
 * delanteros encima.
 *
 * La geometría no puede hornearse en SSG porque depende de la altura real de
 * la sección (nº de sketches × responsive): se mide con ResizeObserver y se
 * genera en cliente con semilla fija (misma altura → misma enredadera). El
 * crecimiento se anima una vez al cargar, desde el suelo hacia arriba, con
 * trazo progresivo (stroke-dashoffset) escalonado por orden de creación; con
 * prefers-reduced-motion se pinta el estado final sin animar.
 */

const SEED = "milpa-frijol";
const DURACION_S = 8; // crecimiento total desde el suelo hasta las puntas
const MAX_FLORES = 18;

// Verde más oscuro y apagado que el tallo (entre matrix.line y matrix.dim,
// ver tailwind.config.ts), un paso más oscuro aún en la capa trasera.
const CAPA_DELANTE = { base: "#124d27", punta: "#00b341" };
const CAPA_DETRAS = { base: "#0b3117", punta: "#0e7a33" };
// neon.violet / neon.orchid (tailwind.config.ts): morado solo como acento de flor.
const FLOR_PETALO = "#a855f7";
const FLOR_BOCA = "#c98bff";

// Trompetilla de perfil apuntando a +x: tubo angosto desde la rama que se
// acampana en una boca de tres lóbulos festoneados.
const TROMPETILLA_D =
  "M0 -1.2 C3.2 -1.6 4.8 -2.4 7.2 -5 Q9.8 -3.6 9.2 -1.7 Q10.8 0 9.2 1.7 Q9.8 3.6 7.2 5 C4.8 2.4 3.2 1.6 0 1.2 Z";

interface Medidas {
  w: number;
  h: number;
}

export default function MilpaFrijol() {
  const ref = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState<Medidas | null>(null);
  const [enredaderas, setEnredaderas] = useState<Enredadera[] | null>(null);
  const [crecido, setCrecido] = useState(false);
  const [sinAnimacion, setSinAnimacion] = useState(false);

  useEffect(() => {
    setSinAnimacion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const rect = el.getBoundingClientRect();
      if (rect.height < 100) return;
      setMedidas((prev) =>
        prev && Math.abs(prev.w - rect.width) < 40 && Math.abs(prev.h - rect.height) < 40
          ? prev
          : { w: Math.round(rect.width), h: Math.round(rect.height) },
      );
    };
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!medidas) return;
    setEnredaderas(
      generateFrijol({ seed: SEED, width: medidas.w, height: medidas.h }),
    );
  }, [medidas]);

  // Doble rAF: garantiza un frame pintado con dashoffset=1 antes de soltar la
  // transición; si no, el navegador aplica el estado final sin animar.
  useEffect(() => {
    if (!enredaderas || crecido) return;
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setCrecido(true));
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [enredaderas, crecido]);

  const listo = medidas !== null && enredaderas !== null;

  const renderCapa = (delante: boolean) => {
    if (!listo) return null;
    const colores = delante ? CAPA_DELANTE : CAPA_DETRAS;
    return (
      <svg
        viewBox={`0 0 ${medidas.w} ${medidas.h}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {delante && (
          <defs>
            <radialGradient id="frijol-flor" cx="85%" cy="50%" r="80%">
              <stop offset="0%" stopColor={FLOR_BOCA} />
              <stop offset="100%" stopColor={FLOR_PETALO} />
            </radialGradient>
          </defs>
        )}
        {enredaderas.map((vid, v) =>
          vid.cadenas
            .filter((cadena) => cadena.delante === delante)
            .map((cadena) => (
              <path
                key={`${v}-${cadena.orden0}`}
                d={`M ${cadena.puntos
                  .map((p) => `${round2(p.x)} ${round2(p.y)}`)
                  .join(" L ")}`}
                pathLength={1}
                fill="none"
                stroke={lerpHexColor(colores.base, colores.punta, cadena.t)}
                strokeWidth={round2(Math.max(1.5, 4.8 - 3.2 * cadena.t))}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={
                  sinAnimacion
                    ? undefined
                    : {
                        strokeDasharray: 1,
                        strokeDashoffset: crecido ? 0 : 1,
                        transition: `stroke-dashoffset ${round2(
                          Math.max(0.35, (cadena.tramos / vid.total) * DURACION_S),
                        )}s linear ${round2((cadena.orden0 / vid.total) * DURACION_S)}s`,
                      }
                }
              />
            )),
        )}
        {delante &&
          seleccionarFlores(enredaderas).map(({ punta, delayS }, i) => (
            <g
              key={i}
              transform={`translate(${round2(punta.pos.x)} ${round2(punta.pos.y)}) rotate(${round2(punta.anguloDeg)}) scale(2.4)`}
            >
              <g
                style={
                  sinAnimacion
                    ? undefined
                    : {
                        opacity: crecido ? 1 : 0,
                        transform: crecido ? "scale(1)" : "scale(0.2)",
                        transformBox: "fill-box",
                        transformOrigin: "left center",
                        transition: `opacity 0.5s ease-out ${delayS}s, transform 0.5s ease-out ${delayS}s`,
                      }
                }
              >
                {/* cáliz que une la flor a la rama */}
                <path
                  d="M0 -1.6 L2.4 -2 L2.8 0 L2.4 2 L0 1.6 Z"
                  fill={CAPA_DELANTE.base}
                />
                <path
                  d={TROMPETILLA_D}
                  fill="url(#frijol-flor)"
                  stroke={FLOR_PETALO}
                  strokeWidth={0.6}
                  strokeOpacity={0.7}
                />
                {/* boca de la trompetilla */}
                <ellipse cx={8.8} cy={0} rx={1.8} ry={3.2} fill={FLOR_BOCA} fillOpacity={0.9} />
              </g>
            </g>
          ))}
      </svg>
    );
  };

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {renderCapa(false)}
      {/* El tallo de la milpa (antes vivía directo en page.tsx). */}
      <div className="absolute left-1/2 top-0 h-full md:w-9 sm:w-4 -translate-x-1/2 rounded-full bg-gradient-to-b from-matrix-dim via-matrix-green to-matrix-glow shadow-glow-green" />
      {renderCapa(true)}
    </div>
  );
}

/**
 * Elige hasta MAX_FLORES puntas repartidas entre todas las enredaderas,
 * descartando las puntas demasiado cercanas al suelo (brotes abortados del
 * arranque). Cada flor abre justo después de que su rama termina de dibujarse.
 */
function seleccionarFlores(
  enredaderas: Enredadera[],
): { punta: PuntaFrijol; delayS: number }[] {
  const candidatas = enredaderas.flatMap((vid) =>
    vid.puntas
      .filter((p) => p.orden > vid.total * 0.08)
      .map((punta) => ({
        punta,
        delayS: round2((punta.orden / vid.total) * DURACION_S + 0.4),
      })),
  );
  if (candidatas.length <= MAX_FLORES) return candidatas;
  const paso = candidatas.length / MAX_FLORES;
  return Array.from({ length: MAX_FLORES }, (_, i) => candidatas[Math.floor(i * paso)]);
}
