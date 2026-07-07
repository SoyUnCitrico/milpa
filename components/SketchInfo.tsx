import type { SketchMeta } from "@/lib/types";
import { truncar } from "@/lib/text";

/**
 * Panel de información de un sketch: título, autor, origen, descripción,
 * controles y tags. Se apila bajo el canvas en mobile.
 *
 * En modo `compact` (la tarjeta de la galería) la descripción se recorta a 50
 * caracteres para no desbordar la card; el detalle lo usa sin `compact` para
 * mostrar el texto completo.
 */
export default function SketchInfo({
  meta,
  compact,
}: {
  meta: SketchMeta;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-crema sm:text-2xl">
          {meta.title}
        </h2>
        <p className="text-sm text-crema/60">por {meta.author}</p>
      </header>

      <p className="text-sm leading-relaxed text-crema/80 break-words">
        {compact ? truncar(meta.description) : meta.description}
      </p>

      {meta.needsAudio && (
        <p className="rounded-md border border-acento2/40 bg-acento2/10 px-3 py-2 text-xs text-acento2">
          🔊 Requiere audio: hacé clic en el canvas para habilitar el sonido.
        </p>
      )}

      {meta.controls && meta.controls.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs uppercase tracking-wider text-crema/50">
            Controles
          </h3>
          <ul className="flex flex-col gap-1">
            {meta.controls.map((control, i) => (
              <li key={i} className="flex gap-2 text-sm text-crema/80">
                <kbd className="shrink-0 rounded border border-crema/20 bg-panel px-2 py-0.5 font-mono text-xs">
                  {control.key}
                </kbd>
                <span>{control.action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {meta.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-acento/40 bg-acento/10 px-2.5 py-0.5 text-xs text-acento"
          >
            {tag}
          </span>
        ))}
      </div>

      <p className="mt-2 text-xs text-crema/40">
        Origen:{" "}
        <code className="break-all text-crema/60">{meta.source}</code>
      </p>
    </div>
  );
}
