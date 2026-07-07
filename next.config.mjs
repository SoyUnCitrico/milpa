/**
 * Export estático (`output: "export"`) para servir el sitio tanto en Vercel
 * (en la raíz del dominio) como en GitHub Pages /docs (en una subruta).
 *
 * El único punto en conflicto entre ambos es `basePath`: GitHub project page
 * necesita `/REPO`, Vercel sirve en la raíz. Se resuelve por variable de entorno
 * `PAGES_BASE_PATH`: vacío para Vercel, `/NOMBRE-REPO` para el build de /docs.
 */
// Normaliza el nombre del repo a un basePath `/REPO`. Acepta "REPO", "/REPO" y
// tolera el mangling de Git Bash (MSYS), que convierte "/REPO" en
// "C:/Program Files/Git/REPO": en todos los casos toma el último segmento.
// (Las project pages de GitHub son de un solo segmento = el nombre del repo.)
function normalizeBase(raw) {
  if (!raw) return "";
  const name = raw.replace(/[\\/]+$/, "").replace(/^.*[\\/]/, "");
  return name ? "/" + name : "";
}

const base = normalizeBase(process.env.PAGES_BASE_PATH);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: base || undefined,
  assetPrefix: base || undefined,
};

export default nextConfig;
