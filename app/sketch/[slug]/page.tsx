import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sketches, getSketch } from "@/lib/sketches";
import SketchDetail from "@/components/SketchDetail";

export function generateStaticParams() {
  return sketches.map((entry) => ({ slug: entry.meta.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const entry = getSketch(params.slug);
  if (!entry) return { title: "Sketch no encontrado — MILPA" };
  return {
    title: `${entry.meta.title} — MILPA`,
    description: entry.meta.description,
  };
}

export default async function SketchPage({
  params,
}: {
  params: { slug: string };
}) {
  const entry = getSketch(params.slug);
  if (!entry) notFound();

  // El código original está vendorizado en `originals/` (lo copia
  // `scripts/sync-originals.mjs`), para que el build sea self-contained.
  let code = "";
  try {
    const filePath = path.join(process.cwd(), "originals", entry.meta.source);
    code = await fs.readFile(filePath, "utf8");
  } catch {
    code = `// No se pudo cargar el código original de ${entry.meta.source}.`;
  }

  return <SketchDetail slug={entry.meta.slug} code={code} />;
}
