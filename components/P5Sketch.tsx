"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type p5 from "p5";
import type { SketchFactory } from "@/lib/types";

interface P5SketchProps {
  factory: SketchFactory;
  /** Resolución lógica del sketch (la que usa `createCanvas`). */
  width: number;
  height: number;
  className?: string;
  /** Si la pieza usa p5.sound: carga el addon y muestra el gesto de audio. */
  needsAudio?: boolean;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Wrapper reutilizable: monta un sketch de p5 en **modo instancia** dentro de un
 * `ref` y lo destruye en el cleanup del `useEffect`.
 *
 * - p5 se importa dinámicamente *dentro* del efecto (solo corre en el browser),
 *   evitando el acceso a `window`/`document` en SSR.
 * - Se pasa el **constructor** de p5 como 2º argumento de la factory para las
 *   piezas que instancian componentes de p5.sound.
 * - Si `needsAudio`, se carga el addon `p5.sound` y se muestra un overlay de gesto
 *   (el navegador exige interacción antes de iniciar el AudioContext).
 * - **Escalado responsivo por `transform: scale()`**: el sketch se monta a su
 *   tamaño lógico nativo (`width`×`height`) y se escala junto con cualquier
 *   elemento DOM que cree (sliders, botones). Así los sliders posicionados en
 *   coordenadas del canvas quedan **alineados** a cualquier ancho, en vez de
 *   estirar solo el canvas con CSS y dejar los controles fuera de sitio.
 */
export default function P5Sketch({
  factory,
  width,
  height,
  className,
  needsAudio,
}: P5SketchProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<p5 | undefined>(undefined);
  const [scale, setScale] = useState(1);
  const [audioReady, setAudioReady] = useState(false);
  // Resolución lógica REAL de la pieza. Parte de las props (meta) y se adopta la
  // del canvas tras el montaje si el sketch eligió otra en setup() (p. ej. una
  // variante retrato en móvil). Para las piezas que crean el canvas exactamente
  // a meta.width×height nunca cambia.
  const [dims, setDims] = useState({ w: width, h: height });

  // Mide el ancho disponible y calcula la escala (cabe sin pasarse de 1:1).
  useIsomorphicLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const available = entries[0].contentRect.width;
      setScale(Math.min(1, available / dims.w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [dims.w]);

  // Monta / destruye la instancia de p5.
  useEffect(() => {
    let cancelled = false;
    setAudioReady(false);
    setDims({ w: width, h: height });

    (async () => {
      const p5Module = (await import("p5")).default;

      if (needsAudio) {
        // p5.sound se cuelga del constructor global; el bundler necesita window.p5.
        (window as unknown as { p5: typeof p5 }).p5 = p5Module;
        await import("p5/lib/addons/p5.sound");
      }

      if (cancelled || !containerRef.current) return;
      instanceRef.current = new p5Module(
        (p) => factory(p, p5Module),
        containerRef.current,
      );

      // Adopta la resolución lógica real del canvas si difiere de la del meta.
      // setup() suele correr síncrono, pero con preload se difiere: se reintenta
      // en un rAF por si el canvas aún no existe.
      const adoptDims = () => {
        if (cancelled) return;
        const inst = instanceRef.current;
        if (!inst) return;
        if (inst.width > 0 && (inst.width !== width || inst.height !== height)) {
          setDims({ w: inst.width, h: inst.height });
        } else if (!(inst.width > 0)) {
          requestAnimationFrame(adoptDims);
        }
      };
      adoptDims();
    })();

    return () => {
      cancelled = true;
      // Detiene cualquier MediaStream de la pieza (createCapture): p5.remove()
      // saca los <video> del DOM pero no apaga la cámara.
      containerRef.current?.querySelectorAll("video").forEach((v) => {
        const s = v.srcObject;
        if (s instanceof MediaStream) s.getTracks().forEach((t) => t.stop());
      });
      instanceRef.current?.remove();
      instanceRef.current = undefined;
    };
  }, [factory, needsAudio, width, height]);

  const startAudio = () => {
    const instance = instanceRef.current as
      | (p5 & { userStartAudio?: () => void })
      | undefined;
    instance?.userStartAudio?.();
    setAudioReady(true);
  };

  return (
    <div
      ref={wrapRef}
      className={"relative w-full overflow-hidden" + (className ? ` ${className}` : "")}
      style={{ height: dims.h * scale }}
    >
      <div
        ref={containerRef}
        className="relative [&_canvas]:block"
        style={{
          width: dims.w,
          height: dims.h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
      {needsAudio && !audioReady && (
        <button
          onClick={startAudio}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-fondo/70 text-crema backdrop-blur-sm transition hover:bg-fondo/60"
        >
          <span className="text-3xl">▶</span>
          <span className="text-sm">Activar audio</span>
        </button>
      )}
    </div>
  );
}
