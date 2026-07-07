"use client";

import { useState } from "react";

/**
 * Bloque de código con números de línea, scroll horizontal y botón de copiar.
 * Sin dependencias de resaltado: monospace tabular y colores de marca.
 */
export default function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n+$/, "").split("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard no disponible */
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-crema/10 bg-fondo">
      <button
        onClick={copy}
        className="absolute right-2 top-2 z-10 rounded border border-crema/20 bg-panel px-2 py-1 text-xs text-crema/70 transition hover:border-acento hover:text-acento"
      >
        {copied ? "✓ copiado" : "copiar"}
      </button>
      <pre className="overflow-auto p-3 text-xs leading-relaxed">
        <code className="table w-full">
          {lines.map((line, i) => (
            <span key={i} className="table-row">
              <span className="table-cell select-none pr-4 text-right text-crema/25">
                {i + 1}
              </span>
              <span className="table-cell whitespace-pre text-crema/85">
                {line || " "}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
