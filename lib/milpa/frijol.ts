import { growTowardAttractors } from "./spaceColonization";
import type { Point, Segment } from "./spaceColonization";
import { createRng } from "./random";

/**
 * Enredaderas de frijol trepando el tallo de la milpa (simbiosis maíz-frijol):
 * misma colonización del espacio que raíces/hojas, pero los atractores se
 * siembran en una banda helicoidal alrededor del tallo — x oscila con seno
 * sobre y — para que el crecimiento suba enredándose desde el suelo. La fase
 * de la hélice (coseno) decide si cada tramo pasa por delante o por detrás
 * del tallo, que es lo que da el efecto 2D de "enredarse".
 *
 * El tallo mide miles de píxeles: una sola corrida de growTowardAttractors
 * sobre esa altura se estanca (con atractores uniformes aparecen huecos
 * mayores que attractionDist) y es O(atractores × nodos) sobre conjuntos
 * enormes. Por eso se coloniza por BANDAS de abajo hacia arriba: cada banda
 * corre con sus propios atractores (en grilla con jitter, sin huecos) y se
 * enraíza en las puntas más altas de la banda anterior, reusando el punto
 * exacto para que la enredadera quede conectada.
 */

export interface PuntaFrijol {
  pos: Point;
  /** Dirección del último tramo en grados (0 = +x, sentido horario de SVG). */
  anguloDeg: number;
  /** Índice de creación del tramo terminal (escalona la apertura de la flor). */
  orden: number;
}

/**
 * Polilínea de tramos consecutivos sin ramificar, del mismo lado del tallo.
 * Renderizar cadenas en vez de tramos sueltos baja el DOM de miles de <path>
 * a cientos y hace que el trazo crezca continuo a lo largo de la rama.
 */
export interface CadenaFrijol {
  puntos: Point[];
  /** Orden de creación del primer tramo (delay del dibujo). */
  orden0: number;
  /** Nº de tramos (duración del dibujo). */
  tramos: number;
  /** true si pasa por delante del tallo. */
  delante: boolean;
  /** Progreso de altura del punto medio: 0 = suelo, 1 = copa (color/grosor). */
  t: number;
}

export interface Enredadera {
  cadenas: CadenaFrijol[];
  puntas: PuntaFrijol[];
  /** Nº total de tramos, para normalizar los delays del crecimiento. */
  total: number;
}

export interface GenerateFrijolOptions {
  seed: string;
  width: number;
  height: number;
  /** x del centro del tallo; por defecto el centro del ancho. */
  stalkX?: number;
  numEnredaderas?: number;
}

const BANDA_H = 1100;
const SEG_LENGTH = 13;
/** Tramos máximos por cadena: mantiene fino el degradado de color por altura. */
const MAX_TRAMOS_CADENA = 50;

export function generateFrijol(opts: GenerateFrijolOptions): Enredadera[] {
  const { seed, width, height, stalkX = width / 2, numEnredaderas = 3 } = opts;

  const enredaderas: Enredadera[] = [];
  for (let v = 0; v < numEnredaderas; v++) {
    const rng = createRng(`${seed}-${v}`);
    const fase = rng() * Math.PI * 2;
    const lambda = 350 + rng() * 150; // altura de una vuelta completa
    const amplitud = 30 + rng() * 30; // media anchura del vaivén alrededor del tallo
    const helixX = (y: number) =>
      stalkX + amplitud * Math.sin((Math.PI * 2 * y) / lambda + fase);
    const delanteEn = (y: number) =>
      Math.cos((Math.PI * 2 * y) / lambda + fase) >= 0;

    const segmentos: Segment[] = [];
    let roots: Point[] = [{ x: helixX(height) + (rng() * 2 - 1) * 10, y: height }];

    const numBandas = Math.ceil(height / BANDA_H);
    for (let b = 0; b < numBandas; b++) {
      const yBot = height - b * BANDA_H;
      const yTop = Math.max(0, yBot - BANDA_H);

      // Grilla vertical con jitter (nunca huecos > attractionDist) sobre la
      // hélice; ~12% de mechones hacia afuera → ramitas/zarcillos. Se extiende
      // un poco bajo la banda para alcanzar puntas que quedaron cortas.
      const attractors: Point[] = [];
      const paso = 9;
      const yFin = Math.min(height, yBot + 60);
      for (let y = yTop; y < yFin; y += paso) {
        const yy = y + rng() * paso;
        let x = helixX(yy) + (rng() * 2 - 1) * 8;
        if (rng() < 0.12) x += (x >= stalkX ? 1 : -1) * (20 + rng() * 55);
        attractors.push({ x, y: yy });
      }

      const nuevos = growTowardAttractors({
        rootPoints: roots,
        attractors,
        attractionDist: 80,
        killDist: 16,
        segLength: SEG_LENGTH,
        maxSegments: Math.round((BANDA_H / SEG_LENGTH) * 2.6),
      });

      if (nuevos.length === 0) {
        // La banda no arrancó (puntas demasiado lejos): re-anclar sobre la
        // hélice en el TOPE de esta banda — donde nace la siguiente — para
        // que el ascenso continúe en vez de fallar en cascada hasta la copa.
        roots = [{ x: helixX(yTop + 1), y: yTop + 1 }];
        continue;
      }

      segmentos.push(...nuevos);

      // Raíces de la siguiente banda: las puntas más altas de esta. Se reusa
      // el punto exacto para que el encadenado global (from === to) funcione.
      const origenes = new Set(nuevos.map((s) => `${s.from.x},${s.from.y}`));
      const tips = nuevos
        .filter((s) => !origenes.has(`${s.to.x},${s.to.y}`))
        .map((s) => s.to)
        .sort((a, b) => a.y - b.y);
      roots = tips.slice(0, 3);
      if (roots.length === 0) roots = [nuevos[nuevos.length - 1].to];
    }

    // Puntas terminales globales: extremos que no son origen de ningún tramo.
    // Comparación exacta: growTowardAttractors (y el encadenado de bandas)
    // reusan el mismo punto del nodo padre al emitir hijos.
    const origenes = new Set(segmentos.map((s) => `${s.from.x},${s.from.y}`));
    const puntas: PuntaFrijol[] = segmentos
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !origenes.has(`${s.to.x},${s.to.y}`))
      .map(({ s, i }) => ({
        pos: s.to,
        anguloDeg: (Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x) * 180) / Math.PI,
        orden: i,
      }));

    enredaderas.push({
      cadenas: construirCadenas(segmentos, delanteEn, height),
      puntas,
      total: segmentos.length,
    });
  }

  return enredaderas;
}

/**
 * Agrupa los tramos en polilíneas: se sigue al hijo único mientras no haya
 * ramificación, no cambie de lado del tallo y no se pase MAX_TRAMOS_CADENA.
 * En una rama (dos hijos) o punta se corta; los hijos restantes inician sus
 * propias cadenas cuando el barrido en orden de creación los alcanza.
 */
function construirCadenas(
  segmentos: Segment[],
  delanteEn: (y: number) => boolean,
  height: number,
): CadenaFrijol[] {
  const clave = (p: Point) => `${p.x},${p.y}`;
  const porOrigen = new Map<string, number[]>();
  segmentos.forEach((s, i) => {
    const k = clave(s.from);
    const lista = porOrigen.get(k);
    if (lista) lista.push(i);
    else porOrigen.set(k, [i]);
  });

  const delanteDe = (s: Segment) => delanteEn((s.from.y + s.to.y) / 2);
  const usados = new Array(segmentos.length).fill(false);
  const cadenas: CadenaFrijol[] = [];

  for (let i = 0; i < segmentos.length; i++) {
    if (usados[i]) continue;
    usados[i] = true;
    let actual = segmentos[i];
    const delante = delanteDe(actual);
    const puntos: Point[] = [actual.from, actual.to];
    let tramos = 1;

    while (tramos < MAX_TRAMOS_CADENA) {
      const hijos = (porOrigen.get(clave(actual.to)) ?? []).filter((j) => !usados[j]);
      if (hijos.length !== 1) break;
      const siguiente = segmentos[hijos[0]];
      if (delanteDe(siguiente) !== delante) break;
      usados[hijos[0]] = true;
      puntos.push(siguiente.to);
      actual = siguiente;
      tramos++;
    }

    const medio = puntos[Math.floor(puntos.length / 2)];
    cadenas.push({
      puntos,
      orden0: i,
      tramos,
      delante,
      t: Math.max(0, Math.min(1, 1 - medio.y / height)),
    });
  }

  return cadenas;
}
