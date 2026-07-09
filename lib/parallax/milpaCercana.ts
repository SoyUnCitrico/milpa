import { convexHull } from "@/lib/milpa/hull";
import { createRng } from "@/lib/milpa/random";
import { generateLeaf } from "@/lib/milpa/spaceColonization";
import type { Point, Segment } from "@/lib/milpa/spaceColonization";

/**
 * Matas de milpa del primer plano (capa 3). Cada mata es un tallo con hojas
 * generadas con la misma venación por colonización del espacio que MilpaHoja
 * (generateLeaf), pero más grandes. La geometría se precalcula una vez; la
 * deformación por scroll/viento se aplica al dibujar, rotando cada punto
 * sobre la base de su hoja con peso proporcional a la profundidad del
 * segmento (las puntas se mueven más que las bases).
 *
 * Coordenadas locales de la mata: pie del tallo en el origen, y crece hacia
 * -y. Las hojas viven en coords locales de hoja: base en el origen, +x hacia
 * afuera; `espejo` decide el lado al dibujar.
 */

export interface HojaMata {
  /** Punto de inserción en el tallo (coords locales de la mata). */
  base: Point;
  espejo: 1 | -1;
  /** Inclinación de reposo (rad; negativo = apunta hacia arriba). */
  anguloBase: number;
  /** Rad extra que la hoja se abre (cae) conforme avanza el scroll. */
  apertura: number;
  /** Fase propia de oscilación por viento. */
  fase: number;
  /**
   * Venación en coords locales de hoja (base en el origen, +x afuera),
   * agrupada en 4 cubetas por profundidad: así el dibujo cambia de stroke
   * 4 veces por hoja en vez de una por segmento.
   */
  cubetas: [Segment[], Segment[], Segment[], Segment[]];
  /** Alcance de la hoja en x local (peso del doblez por viento). */
  largo: number;
  /** Silueta (casco convexo de la venación, como MilpaHoja): se rellena
   *  translúcida para que la hoja se lea como hoja y no como ramas. */
  casco: Point[];
}

export interface Mata {
  /** Pie del tallo, en coords de la capa (y = línea de suelo). */
  x: number;
  alturaTallo: number;
  grosorTallo: number;
  hojas: HojaMata[];
  /** Anclas de flores (coords locales de la mata) donde se posa la fauna. */
  flores: Point[];
}

export interface OpcionesMilpaCercana {
  width: number;
  /** Altura máxima de tallo, en px. */
  alturaMax: number;
  seed: number | string;
  cantidad?: number;
}

export function generarMilpaCercana(opts: OpcionesMilpaCercana): Mata[] {
  const { width, alturaMax, seed, cantidad = 5 } = opts;
  const rng = createRng(seed);
  const matas: Mata[] = [];

  for (let i = 0; i < cantidad; i++) {
    const alturaTallo = alturaMax * (0.6 + rng() * 0.4);
    const x = ((i + 0.2 + rng() * 0.6) / cantidad) * width;
    // Presupuesto: ~900 líneas vivas por frame en total (matas × hojas × segs).
    const numHojas = 3 + Math.floor(rng() * 2);
    const hojas: HojaMata[] = [];

    for (let j = 0; j < numHojas; j++) {
      // Inserciones repartidas por el tallo, alternando lado.
      const alturaInsercion = alturaTallo * (0.25 + 0.65 * (j / numHojas)) ;
      const espejo: 1 | -1 = j % 2 === 0 ? 1 : -1;
      const largo = alturaTallo * (0.55 + rng() * 0.35) * (1 - 0.35 * (j / numHojas));
      const anchoHoja = largo * (0.32 + rng() * 0.12);
      const crudos = generateLeaf({
        width: largo,
        height: anchoHoja,
        seed: `${String(seed)}-hoja-${i}-${j}`,
        numAttractors: 60,
        maxSegments: 80,
      });
      // generateLeaf arranca en (0, height/2): se recentra la base al origen.
      let maxDepth = 1;
      const segmentos: Segment[] = crudos.map((s) => {
        if (s.depth > maxDepth) maxDepth = s.depth;
        return {
          from: { x: s.from.x, y: s.from.y - anchoHoja / 2 },
          to: { x: s.to.x, y: s.to.y - anchoHoja / 2 },
          depth: s.depth,
        };
      });

      const cubetas: [Segment[], Segment[], Segment[], Segment[]] = [[], [], [], []];
      let largoReal = 1;
      for (const s of segmentos) {
        cubetas[Math.min(3, Math.floor((s.depth / maxDepth) * 4))].push(s);
        if (s.to.x > largoReal) largoReal = s.to.x;
      }
      const casco = convexHull([{ x: 0, y: 0 }, ...segmentos.map((s) => s.to)]);

      hojas.push({
        base: { x: 0, y: -alturaInsercion },
        espejo,
        // Las hojas bajas nacen más horizontales; las altas, más erguidas.
        anguloBase: -(0.35 + 0.5 * (j / numHojas) + rng() * 0.15),
        apertura: 0.25 + rng() * 0.3,
        fase: rng() * Math.PI * 2,
        cubetas,
        largo: largoReal,
        casco,
      });
    }

    // Flores ancla: la punta del tallo (espiga) y una inserción media.
    const flores: Point[] = [
      { x: 0, y: -alturaTallo },
      { x: 0, y: -alturaTallo * (0.55 + rng() * 0.2) },
    ];

    matas.push({
      x,
      alturaTallo,
      grosorTallo: 10 + rng() * 2.5,
      hojas,
      flores,
    });
  }

  return matas;
}
