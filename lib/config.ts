/**
 * Cada carpeta de primer nivel del monorepo legacy es su propio repo de GitHub
 * bajo este owner (p. ej. `SoyUnCitrico/creativeCode`, `SoyUnCitrico/p5_works`).
 * El campo `source` de cada sketch es `repo/ruta/dentro/del/repo.js`.
 */
export const GITHUB_OWNER = "SoyUnCitrico";

/**
 * Repos cuyo owner no es el default. La mayoría del monorepo legacy es de
 * `SoyUnCitrico`, pero los talleres `Talleres2021-CC*` son de la org `ccdtecno`.
 */
const OWNER_POR_REPO: Record<string, string> = {
  "Talleres2021-CC1": "ccdtecno",
  "Talleres2021-CC2": "ccdtecno",
  "Talleres2021-CC3": "ccdtecno",
  "Code-Package-p5.js": "generative-design",
};

/**
 * Construye la URL de GitHub al archivo fuente original.
 * `creativeCode/revolution.js` → https://github.com/SoyUnCitrico/creativeCode/blob/HEAD/revolution.js
 * (se usa `HEAD` para apuntar a la rama por defecto sin asumir main vs master).
 */
export function sourceUrl(source: string): string {
  const [repo, ...rest] = source.split("/");
  const owner = OWNER_POR_REPO[repo] ?? GITHUB_OWNER;
  return `https://github.com/${owner}/${repo}/blob/HEAD/${rest.join("/")}`;
}

/**
 * Base del bucket S3 donde viven los pósters estáticos de la grilla.
 */
export const SKETCH_IMAGE_BASE =
  "https://amazons3-images-micel10.s3.us-east-2.amazonaws.com/images/sketches";

/** URL del póster estático de un sketch, derivada de su slug. */
export function sketchImageUrl(slug: string): string {
  return `${SKETCH_IMAGE_BASE}/${slug}.png`;
}

/**
 * Mazorca que brota de los nodos superiores de la milpa (PNG 1024×1024 con
 * fondo transparente; el olote apunta hacia abajo-izquierda).
 */
export const MAZORCA_IMAGE_URL =
  "https://amazons3-images-micel10.s3.us-east-2.amazonaws.com/images/gallery/mazorca.png";
