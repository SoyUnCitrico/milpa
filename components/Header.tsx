"use client";

import Link from "next/link";

/**
 * Barra superior sticky, compartida entre la vista de detalle y la página
 * principal. `showNav`/`onToggleNav` son props controladas (cada página
 * decide dónde y cómo renderizar el <NavPanel> que ese botón togglea, ya
 * que el layout difiere: columna lateral fija en detalle, bloque de ancho
 * completo en la principal). `title`/`showCode`/`onToggleCode` son
 * opcionales — sin ellos, el header queda reducido a botón-nav + link MILPA
 * (el caso de la página principal).
 */
export default function Header({
  showNav,
  onToggleNav,
  title,
  showCode,
  onToggleCode,
}: {
  showNav: boolean;
  onToggleNav: () => void;
  title?: string;
  showCode?: boolean;
  onToggleCode?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-crema/10 bg-fondo/95 px-3 backdrop-blur">
      <button
        onClick={onToggleNav}
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

      {title && (
        <>
          <span className="text-crema/30">/</span>
          <h1 className="truncate text-sm font-semibold text-crema">
            {title}
          </h1>
        </>
      )}

      {onToggleCode && (
        <button
          onClick={onToggleCode}
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
      )}
    </header>
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
