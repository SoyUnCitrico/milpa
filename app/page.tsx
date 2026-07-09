import GalleryHeader from "@/components/GalleryHeader";
import MilpaFrijol from "@/components/MilpaFrijol";
import MilpaLeaf from "@/components/MilpaLeaf";
import MilpaHoja from "@/components/MilpaHoja";
import MilpaMazorca from "@/components/MilpaMazorca";
import MilpaPistilos from "@/components/MilpaPistilos";
import MilpaRaices from "@/components/MilpaRaices";
import SketchCard from "@/components/SketchCard";
import { createRng } from "@/lib/milpa/random";
import { sketches } from "@/lib/sketches";

export default function Home() {
  // La milpa crece de abajo hacia arriba: los sketches más básicos (los
  // primeros registrados en lib/sketches/index.ts) son la base, hasta abajo;
  // los más recientes/complejos quedan arriba. Es el inverso del registro.
  const milpa = [...sketches].reverse();

  // Mazorcas: brotan de nodos superiores del tallo — al azar pero
  // determinista (semilla fija), máximo 3 y solo entre las filas del tercio
  // superior (las primeras del DOM). Fisher-Yates parcial sobre los índices
  // candidatos para elegir sin repetir.
  const mazorcaRng = createRng("milpa-mazorcas");
  const filasSuperiores = Math.max(1, Math.ceil(milpa.length / 3));
  const candidatas = Array.from({ length: filasSuperiores }, (_, i) => i);
  for (let i = candidatas.length - 1; i > 0; i--) {
    const j = Math.floor(mazorcaRng() * (i + 1));
    [candidatas[i], candidatas[j]] = [candidatas[j], candidatas[i]];
  }
  const filasConMazorca = new Set(candidatas.slice(0, Math.min(3, filasSuperiores)));

  return (
    <>
      <GalleryHeader />
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
            {/* Tallo + enredaderas de frijol (el tallo vive dentro, entre las
                dos capas SVG de la enredadera). */}
            <MilpaFrijol />
            {milpa.map((entry, i) => {
              const side = i % 2 === 0 ? "left" : "right";
              const companionSide = side === "left" ? "right" : "left";
              return (
                <MilpaLeaf
                  key={entry.meta.slug}
                  side={side}
                  companion={<MilpaHoja seed={entry.meta.slug} side={companionSide} />}
                  extra={
                    filasConMazorca.has(i) ? (
                      <MilpaMazorca seed={entry.meta.slug} side={companionSide} />
                    ) : undefined
                  }
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
    </>
  );
}
