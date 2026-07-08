import Link from "next/link";
import { sketches } from "@/lib/sketches";

/**
 * Panel de navegación: link externo + lista de todos los sketches. Overlay
 * fijo en ambos breakpoints (no empuja contenido): en mobile se despliega
 * hacia abajo desde debajo del header; en desktop entra deslizándose desde
 * la izquierda. Permanece montado siempre (`open` solo cambia clases) para
 * que la transición de `transform` pueda animar tanto la apertura como el
 * cierre.
 */
export default function NavPanel({
  currentSlug,
  open,
}: {
  currentSlug?: string;
  open: boolean;
}) {
  return (
    <nav
      aria-hidden={!open}
      className={`scrollbar-thumb-transparent scrollbar-track-[#0a140d] fixed inset-x-0 top-12 z-20 max-h-[75vh] overflow-y-auto border-b border-crema/10 bg-panel/95 backdrop-blur-md transition-transform duration-300 ease-out ${open ? "translate-y-0" : "-translate-y-full -mt-12"} lg:inset-x-auto lg:left-0 lg:top-12 lg:bottom-0 lg:max-h-none lg:w-72 lg:translate-y-0 lg:border-b-0 lg:border-r ${open ? "lg:translate-x-0" : "lg:-translate-x-full"} ${open ? "" : "pointer-events-none"}`}
      
    >
      <div className="p-4 lg:w-72">
        <a
          href="https://www.emm3.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex items-center gap-2 text-sm text-crema/70 transition hover:text-crema"
        >
          Emm3
        </a>
        <h2 className="mb-2 text-xs uppercase tracking-wider text-crema/40">
          Sketches
        </h2>
        <ul className="flex flex-col gap-1">
          {sketches.map((e) => {
            const active = e.meta.slug === currentSlug;
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
      </div>
    </nav>
  );
}
