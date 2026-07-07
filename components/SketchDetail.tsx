"use client";

import { useState } from "react";
import Link from "next/link";
import P5Sketch from "./P5Sketch";
import SketchInfo from "./SketchInfo";
import CodeBlock from "./CodeBlock";
import { sketches, getSketch } from "@/lib/sketches";
import { sourceUrl } from "@/lib/config";

/**
 * Vista de detalle de un sketch:
 *  - barra superior con dos botones para ocultar/mostrar cada panel,
 *  - barra de navegación a la izquierda (arriba en mobile): home + sketches,
 *  - canvas en grande al centro + info,
 *  - barra de código original a la derecha (abajo en mobile) con enlace a GitHub.
 *
 * Layout responsivo: un único flex en orden [nav, main, código] que es
 * `flex-col` en mobile (nav arriba, código abajo) y `flex-row` en desktop
 * (nav izquierda, código derecha).
 *
 * Recibe solo `slug` y `code` (strings); la factory se resuelve del registro en
 * el cliente porque las funciones no cruzan el límite Server → Client.
 */
export default function SketchDetail({
  slug,
  code,
}: {
  slug: string;
  code: string;
}) {
  const [showNav, setShowNav] = useState(true);
  const [showCode, setShowCode] = useState(true);

  const entry = getSketch(slug);
  if (!entry) return null;
  const { meta, factory } = entry;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-crema/10 bg-fondo/95 px-3 py-2 backdrop-blur">
        <button
          onClick={() => setShowNav((v) => !v)}
          aria-label={showNav ? "Ocultar navegación" : "Mostrar navegación"}
          aria-pressed={showNav}
          className={`rounded-md border px-2 py-1.5 transition ${
            showNav
              ? "border-acento/50 text-acento"
              : "border-crema/20 text-crema/60 hover:text-crema"
          }`}
        >
          <PanelLeftIcon />
        </button>

        <Link
          href="/"
          className="truncate text-sm text-crema/70 transition hover:text-crema"
        >
          MILPA
        </Link>
        <span className="text-crema/30">/</span>
        <h1 className="truncate text-sm font-semibold text-crema">
          {meta.title}
        </h1>

        <button
          onClick={() => setShowCode((v) => !v)}
          aria-label={showCode ? "Ocultar código" : "Mostrar código"}
          aria-pressed={showCode}
          className={`ml-auto rounded-md border px-2 py-1.5 transition ${
            showCode
              ? "border-acento/50 text-acento"
              : "border-crema/20 text-crema/60 hover:text-crema"
          }`}
        >
          <CodeIcon />
        </button>
      </header>

      {/* Cuerpo: nav | canvas | código */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Navegación */}
        {showNav && (
          <nav className="shrink-0 border-b border-crema/10 bg-panel/30 p-4 lg:w-60 lg:border-b-0 lg:border-r">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-crema/70 transition hover:text-crema"
            >
              ← Galería
            </Link>
            <h2 className="mb-2 text-xs uppercase tracking-wider text-crema/40">
              Sketches
            </h2>
            <ul className="flex flex-col gap-1">
              {sketches.map((e) => {
                const active = e.meta.slug === slug;
                return (
                  <li key={e.meta.slug}>
                    <Link
                      href={`/sketch/${e.meta.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-3 py-2 text-sm transition ${
                        active
                          ? "bg-acento/15 text-acento"
                          : "text-crema/75 hover:bg-crema/5 hover:text-crema"
                      }`}
                    >
                      {e.meta.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {/* Canvas grande + info */}
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-3xl">
            <div className="overflow-hidden rounded-xl border border-crema/10 bg-fondo">
              <P5Sketch
                factory={factory}
                width={meta.width}
                height={meta.height}
                needsAudio={meta.needsAudio}
              />
            </div>
          </div>
          <div className="mx-auto w-full max-w-3xl">
            <SketchInfo meta={meta} />
          </div>
        </main>

        {/* Código original */}
        {showCode && (
          <aside className="shrink-0 border-t border-crema/10 bg-panel/30 p-4 lg:w-[28rem] lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs uppercase tracking-wider text-crema/40">
                Código original
              </h2>
              <a
                href={sourceUrl(meta.source)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-crema/20 px-2 py-1 text-xs text-crema/70 transition hover:border-acento hover:text-acento"
              >
                <GithubIcon /> GitHub ↗
              </a>
            </div>
            <p className="mb-3 break-all text-xs text-crema/40">{meta.source}</p>
            <CodeBlock code={code} />
          </aside>
        )}
      </div>
    </div>
  );
}

function PanelLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.66-.22.66-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.16.58.67.48A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10z" />
    </svg>
  );
}
