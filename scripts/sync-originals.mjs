// Vendoriza el código fuente original de cada sketch dentro del repo MILPA,
// para que el build sea self-contained (Vercel / GitHub Pages no dependen del
// monorepo legacy que está un nivel arriba).
//
// Lee los `source: "<repo>/<ruta>.js"` del registro `lib/sketches/index.ts` y
// copia cada archivo desde `../<source>` (monorepo) a `originals/<source>`.
// Es TOLERANTE: si el origen no existe (p. ej. corriendo en Vercel, donde el
// monorepo no está), conserva la copia ya commiteada en vez de fallar.

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, ".."); // raíz del proyecto
const monorepoRoot = path.resolve(projectRoot, ".."); // legacy/
const registryPath = path.join(projectRoot, "lib", "sketches", "index.ts");
const originalsDir = path.join(projectRoot, "originals");

async function readSources() {
  const src = await fs.readFile(registryPath, "utf8");
  const re = /source:\s*["'`]([^"'`]+)["'`]/g;
  const out = new Set();
  let m;
  while ((m = re.exec(src)) !== null) out.add(m[1]);
  return [...out];
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const sources = await readSources();
  if (sources.length === 0) {
    console.error("sync-originals: no se encontraron `source:` en", registryPath);
    process.exit(1);
  }

  let copied = 0;
  let kept = 0;
  let missing = 0;

  for (const source of sources) {
    const from = path.join(monorepoRoot, source);
    const to = path.join(originalsDir, source);

    if (await exists(from)) {
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.copyFile(from, to);
      copied++;
    } else if (await exists(to)) {
      kept++; // monorepo no disponible pero ya hay copia commiteada
    } else {
      missing++;
      console.warn(`  ⚠ falta el original y no hay copia: ${source}`);
    }
  }

  console.log(
    `sync-originals: ${copied} copiados, ${kept} conservados, ${missing} faltantes (de ${sources.length} sources)`,
  );
  if (missing > 0 && copied === 0 && kept === 0) process.exit(1);
}

main().catch((e) => {
  console.error("sync-originals falló:", e);
  process.exit(1);
});
