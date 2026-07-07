// Construye el sitio estático y lo deja en `docs/` para servirlo por GitHub Pages
// (Source: rama main, carpeta /docs).
//
// Pasos: 1) sincroniza los originales desde el monorepo, 2) `next build` (export
// estático → out/), 3) reemplaza docs/ con el contenido de out/, 4) escribe
// docs/.nojekyll (sin esto GitHub Pages ignora la carpeta `_next/` y no cargan
// los assets).
//
// basePath: para una "project page" (https://usuario.github.io/REPO/) hay que
// pasar el nombre del repo:  PAGES_BASE_PATH=/REPO npm run build:docs

import { promises as fs } from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(projectRoot, "out");
const docsDir = path.join(projectRoot, "docs");

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32", // resolver .cmd (npm/next) en Windows
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`\nbuild-docs: "${cmd} ${args.join(" ")}" salió con código ${r.status}`);
    process.exit(r.status ?? 1);
  }
}

// Mismo criterio que next.config: último segmento → "/REPO" (tolera Git Bash).
function normalizeBase(raw) {
  if (!raw) return "";
  const name = raw.replace(/[\\/]+$/, "").replace(/^.*[\\/]/, "");
  return name ? "/" + name : "";
}

async function main() {
  const base = normalizeBase(process.env.PAGES_BASE_PATH);
  console.log(`build-docs: basePath = ${base || "(raíz, sin basePath)"}`);

  // 1) originales self-contained
  run("node", ["scripts/sync-originals.mjs"]);

  // 2) export estático -> out/
  run("npx", ["next", "build"]);

  // 3) docs/ <- out/
  await fs.rm(docsDir, { recursive: true, force: true });
  await fs.cp(outDir, docsDir, { recursive: true });

  // 4) .nojekyll para que Pages sirva _next/
  await fs.writeFile(path.join(docsDir, ".nojekyll"), "");

  console.log(`\nbuild-docs: listo. Sitio estático en ${path.relative(projectRoot, docsDir)}/`);
  if (!base) {
    console.log(
      "Nota: sin PAGES_BASE_PATH los assets apuntan a la raíz. Para una project page " +
        "(usuario.github.io/REPO/) reconstruí con PAGES_BASE_PATH=/REPO npm run build:docs",
    );
  }
}

main().catch((e) => {
  console.error("build-docs falló:", e);
  process.exit(1);
});
