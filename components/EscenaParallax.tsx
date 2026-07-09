"use client";

import { useEffect, useRef } from "react";
import type p5 from "p5";
import { obtenerClima, REFRESCO_CLIMA_MS } from "@/lib/parallax/clima";
import { crearEscena } from "@/lib/parallax/escena";
import { crearEstadoEscena } from "@/lib/parallax/tipos";

/**
 * Fondo fijo a pantalla completa de la landing: la escena parallax de 4
 * capas (cielo/montaña, árboles, milpa cercana, llovizna/fauna) montada como
 * una única instancia de p5 detrás del contenido (`fixed inset-0 -z-10`).
 *
 * Nada del scroll pasa por React: el draw loop de p5 lee window.scrollY.
 * Este componente solo posee el ciclo de vida (montar/destruir p5), el
 * estado mutable compartido (clima, reduced-motion, alto del documento,
 * overrides de prueba) y la pausa cuando la pestaña no es visible.
 *
 * Overrides de prueba por query param: ?hora=18.5 ?clima=lluvia ?viento=40
 */
export default function EscenaParallax() {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const instanciaRef = useRef<p5 | undefined>(undefined);
  const estadoRef = useRef(crearEstadoEscena());

  // Monta/destruye p5 y los listeners que no dependen de React.
  useEffect(() => {
    const estado = estadoRef.current;
    let cancelado = false;

    const params = new URLSearchParams(window.location.search);
    const hora = params.get("hora");
    if (hora !== null && !Number.isNaN(Number(hora))) {
      estado.override.hora = Number(hora);
    }
    const clima = params.get("clima");
    if (clima === "despejado" || clima === "nublado" || clima === "lluvia") {
      estado.override.condicion = clima;
    }
    const viento = params.get("viento");
    if (viento !== null && !Number.isNaN(Number(viento))) {
      estado.override.vientoKmh = Number(viento);
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    estado.reducedMotion = mq.matches;
    const alCambiarMotion = (e: MediaQueryListEvent) => {
      estado.reducedMotion = e.matches;
      // Con reduce el propio draw se frena tras un frame; sin él, reanuda.
      instanciaRef.current?.loop();
    };
    mq.addEventListener("change", alCambiarMotion);

    // Alto del documento cacheado (el draw lo lee sin forzar layout); la
    // página crece cuando MilpaFrijol mide su sección.
    estado.docAlto = document.documentElement.scrollHeight;
    const observador = new ResizeObserver(() => {
      estado.docAlto = document.documentElement.scrollHeight;
    });
    observador.observe(document.body);

    // Pestaña oculta → cero frames.
    const alCambiarVisibilidad = () => {
      const instancia = instanciaRef.current;
      if (!instancia) return;
      if (document.hidden) instancia.noLoop();
      else if (!estado.reducedMotion) instancia.loop();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    (async () => {
      // p5 se importa dinámicamente dentro del efecto (solo browser), igual
      // que en P5Sketch.tsx.
      const P5 = (await import("p5")).default;
      if (cancelado || !contenedorRef.current) return;
      instanciaRef.current = new P5(crearEscena(estado), contenedorRef.current);
    })();

    return () => {
      cancelado = true;
      mq.removeEventListener("change", alCambiarMotion);
      observador.disconnect();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      instanciaRef.current?.remove();
      instanciaRef.current = undefined;
    };
  }, []);

  // Clima real: una consulta al montar y refresco cada 15 min.
  useEffect(() => {
    const estado = estadoRef.current;
    let activo = true;
    const refrescar = async () => {
      const clima = await obtenerClima();
      if (!activo) return;
      estado.clima = clima;
      // Con reduced-motion el loop está parado: pinta un frame con el nuevo clima.
      if (estado.reducedMotion) instanciaRef.current?.redraw();
    };
    refrescar();
    const id = setInterval(refrescar, REFRESCO_CLIMA_MS);
    return () => {
      activo = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div
      ref={contenedorRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 [&_canvas]:block"
    />
  );
}
