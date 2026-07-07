import MilpaLeaf from "@/components/MilpaLeaf";
import MilpaHoja from "@/components/MilpaHoja";
import MilpaPistilos from "@/components/MilpaPistilos";
import MilpaRaices from "@/components/MilpaRaices";
import SketchCard from "@/components/SketchCard";
import { sketches } from "@/lib/sketches";

export default function Home() {
  // La milpa crece de abajo hacia arriba: los sketches más básicos (los
  // primeros registrados en lib/sketches/index.ts) son la base, hasta abajo;
  // los más recientes/complejos quedan arriba. Es el inverso del registro.
  const milpa = [...sketches].reverse();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-4">
        <p className="text-xs uppercase tracking-[0.2em] text-acento">
          el código se siembra, no se escribe
        </p>
        <h1 className="text-3xl font-bold leading-tight text-matrix-green sm:text-5xl">
          MILPA
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-crema/70 sm:text-base">
          Aquí las obras no están terminadas: están creciendo. Cada una
          empezó siendo tres o cuatro reglas — nada más. Lo que ves es lo que
          esas reglas decidieron hacer cuando las dejamos solas.
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-crema/70 sm:text-base">
          Los abuelos de este territorio ya sabían esto: no controlas el
          maíz. Pones las condiciones y te haces a un lado. El frijol trepa,
          la calabaza cubre, el hongo conecta todo por debajo.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <MilpaPistilos />
        <div className="relative flex flex-col gap-14 lg:gap-20">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 z-0 h-full w-2 -translate-x-1/2 rounded-full bg-gradient-to-b from-matrix-dim via-matrix-green to-matrix-glow shadow-glow-green"
          />
          {milpa.map((entry, i) => {
            const side = i % 2 === 0 ? "left" : "right";
            const companionSide = side === "left" ? "right" : "left";
            return (
              <MilpaLeaf
                key={entry.meta.slug}
                side={side}
                companion={<MilpaHoja seed={entry.meta.slug} side={companionSide} />}
              >
                <SketchCard slug={entry.meta.slug} />
              </MilpaLeaf>
            );
          })}
        </div>

        <MilpaRaices />
      </section>

      <footer className="border-t border-crema/10 pt-6 text-xs text-crema/40">
        Wrapper de p5.js · Next.js · {sketches.length} pieza
        {sketches.length === 1 ? "" : "s"} en la galería.
      </footer>
    </main>
  );
}
