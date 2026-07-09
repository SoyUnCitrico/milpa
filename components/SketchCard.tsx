"use client";

import { useState } from "react";
import Link from "next/link";
import P5Sketch from "./P5Sketch";
import SketchInfo from "./SketchInfo";
import { getSketch } from "@/lib/sketches";
import { sketchImageUrl } from "@/lib/config";

/**
 * Tarjeta de galería: canvas + panel de información. Toda la card enlaza al
 * detalle del sketch (`/sketch/[slug]`) para verlo en grande.
 *
 * Recibe solo el `slug` (string) y resuelve la pieza desde el registro en el
 * cliente, porque la factory del sketch es una función y no puede cruzar el
 * límite Server → Client Component de Next.js como prop.
 *
 * Responsivo: columna apilada en mobile (canvas arriba, info abajo) y dos
 * columnas en desktop (`md:flex-row`).
 */
export default function SketchCard({ slug }: { slug: string }) {
  const entry = getSketch(slug);
  const [imgFailed, setImgFailed] = useState(false);
  if (!entry) return null;

  const { meta, factory } = entry;
  const posterSrc = meta.image ?? sketchImageUrl(meta.slug);
  const aspectRatio = `${meta.width} / ${meta.height}`;

  return (
    <Link
      href={`/sketch/${slug}`}
      className="group block rounded-2xl border border-crema/10 bg-panel/80 p-4 transition hover:border-acento/50 hover:bg-panel/60 hover:shadow-glow-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento sm:p-6"
    >
      <article className="flex flex-col gap-6 md:flex-row overflow-hidden">
        <div className="w-full md:max-w-[60%] md:flex-1">
          <div className="overflow-hidden rounded-xl bg-fondo">
            {!imgFailed ? (
              // Grilla ligera: se muestra un póster estático (S3) en vez de montar
              // el sketch en vivo. Lazy load nativo y responsive; el hueco se
              // reserva por relación de aspecto para evitar layout shift.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterSrc}
                alt={meta.title}
                loading="lazy"
                decoding="async"
                onError={() => setImgFailed(true)}
                className="block w-full h-auto"
                style={{ aspectRatio }}
              />
            ) : meta.needsAudio ? (
              // Fallback sin imagen: las piezas de audio no se montan en la grilla
              // (necesitan p5.sound y el gesto de audio, que vive en el detalle).
              <div
                className="flex w-full flex-col items-center justify-center gap-2 text-crema/50"
                style={{ aspectRatio }}
              >
                <span className="text-3xl">🔊</span>
                <span className="text-sm">Sketch de audio</span>
                <span className="text-xs text-crema/40">Abrir para reproducir</span>
              </div>
            ) : (
              // Fallback sin imagen: se monta el sketch en vivo como antes.
              <P5Sketch factory={factory} width={meta.width} height={meta.height} />
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col md:flex-1">
          <SketchInfo meta={meta} compact />
          <span className="mt-4 text-sm text-crema/40 transition group-hover:text-acento">
            Ver en grande →
          </span>
        </div>
      </article>
    </Link>
  );
}
