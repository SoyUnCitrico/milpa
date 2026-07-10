import { convexHull } from "@/lib/milpa/hull";
import { expandLSystem, interpretTurtle } from "@/lib/milpa/lsystem";
import type { LSystemVariant } from "@/lib/milpa/lsystem";
import { createRng } from "@/lib/milpa/random";
import type { Point, Segment } from "@/lib/milpa/spaceColonization";

/**
 * Bosque sobre la montaña: se generan 3 INSTANCIAS de árbol (una por
 * variante de L-system, reutilizando el motor de lib/milpa) y se estampan
 * muchas veces repartidas por la ladera. La perspectiva es frontal: cuanto
 * más arriba de la ladera (más lejos), más chico y más hundido en bruma.
 * Las estampas viven en el buffer de la montaña, así crecen y viajan con
 * ella al hacer scroll.
 */

// Frondoso clásico: ramifica denso a ambos lados.
const ARBOL_FRONDOSO: LSystemVariant = {
  axiom: "F",
  rules: { F: "F[+F]F[-F]F" },
  iterations: 3,
  angleDeg: 22,
};

// Columnar tipo pino/ciprés: angosto y alto.
const ARBOL_COLUMNAR: LSystemVariant = {
  axiom: "F",
  rules: { F: "FF[+F][-F]" },
  iterations: 3,
  angleDeg: 32,
};

// Abierto tipo huizache: pocas ramas muy anguladas.
const ARBOL_ABIERTO: LSystemVariant = {
  axiom: "F",
  rules: { F: "F[++F][--F][+F]" },
  iterations: 3,
  angleDeg: 26,
};

const VARIANTES = [ARBOL_FRONDOSO, ARBOL_COLUMNAR, ARBOL_ABIERTO];

/** Geometría de un árbol normalizada a altura 1 (pie en el origen, crece a -y). */
export interface InstanciaArbol {
  ramas: Segment[];
  copa: Point[];
}

/** Una estampa de instancia colocada sobre la ladera. */
export interface ArbolPlantado {
  /** Pie del árbol en coordenadas del buffer de la montaña. */
  x: number;
  y: number;
  /** Altura en px de esta estampa. */
  altura: number;
  /** 0 = al pie de la ladera (cerca), 1 = junto a la cresta (lejos). */
  lejania: number;
  /** Índice en el arreglo de instancias. */
  instancia: number;
  /** Espejo horizontal para variar sin regenerar. */
  espejo: 1 | -1;
}

/** Genera las 3 instancias (una por variante), normalizadas a altura 1. */
export function generarInstanciasArbol(seed: number | string): InstanciaArbol[] {
  const rng = createRng(seed);
  return VARIANTES.map((variante) => {
    const instrucciones = expandLSystem(variante.axiom, variante.rules, variante.iterations);
    const ramas = interpretTurtle(instrucciones, {
      stepLength: 10,
      angleDeg: variante.angleDeg,
      angleJitter: 8,
      startAngleDeg: -90,
      rng,
    });

    // Normaliza a altura 1: escala uniforme por la extensión vertical real.
    let minY = 0;
    for (const s of ramas) if (s.to.y < minY) minY = s.to.y;
    const escala = 1 / Math.max(1e-6, -minY);
    const normalizadas: Segment[] = ramas.map((s) => ({
      from: { x: s.from.x * escala, y: s.from.y * escala },
      to: { x: s.to.x * escala, y: s.to.y * escala },
      depth: s.depth,
    }));

    // Copa: casco convexo SOLO de los nodos alejados de la raíz; se excluye
    // la espina del tronco (depth 0) para no encerrarlo.
    let alcance = 0;
    for (const s of normalizadas) {
      const d = Math.hypot(s.to.x, s.to.y);
      if (d > alcance) alcance = d;
    }
    const umbral = alcance * 0.5;
    const puntas: Point[] = [];
    for (const s of normalizadas) {
      if (s.depth >= 1 && Math.hypot(s.to.x, s.to.y) >= umbral) puntas.push(s.to);
    }
    const copa = puntas.length >= 3 ? convexHull(puntas) : [];

    return { ramas: normalizadas, copa };
  });
}

export interface OpcionesPlantado {
  /** Cresta principal de la montaña (coords del buffer, x creciente). */
  cresta: Point[];
  /** Y del horizonte en el buffer (pie de la ladera). */
  yHorizonte: number;
  seed: number | string;
  cantidad?: number;
  /** Altura en px de un árbol al pie de la ladera (los lejanos se reducen). */
  alturaCercana: number;
  numInstancias: number;
}

/**
 * Reparte estampas por toda la cara visible de la montaña: solo donde la
 * ladera existe (cresta por encima del horizonte), a cualquier altura entre
 * la cresta y el pie, encogiendo con la lejanía. Se devuelven ordenadas de
 * lejos a cerca para pintarlas con solapado correcto.
 */
export function plantarBosque(opts: OpcionesPlantado): ArbolPlantado[] {
  const { cresta, yHorizonte, seed, cantidad = 20, alturaCercana, numInstancias } = opts;
  const rng = createRng(seed);
  const plantados: ArbolPlantado[] = [];
  const n = cresta.length;
  const alturaMinLadera = alturaCercana * 0.5;

  let intentos = 0;
  while (plantados.length < cantidad && intentos < cantidad * 12) {
    intentos++;
    const i = Math.floor(rng() * n);
    const punto = cresta[Math.min(n - 1, i)];
    const alturaLadera = yHorizonte - punto.y;
    // Solo donde de verdad hay montaña bajo el punto.
    if (alturaLadera < alturaMinLadera) continue;

    // t = 0 pegado a la cresta (lejos) … 1 al pie de la ladera (cerca).
    const t = rng();
    const y = punto.y + alturaLadera * (0.12 + 0.88 * t);
    const lejania = 1 - t;
    plantados.push({
      x: punto.x + (rng() * 2 - 1) * (cresta[1].x - cresta[0].x) * 2,
      y,
      altura: alturaCercana * (0.35 + 0.65 * t),
      lejania,
      instancia: Math.floor(rng() * numInstancias),
      espejo: rng() < 0.5 ? -1 : 1,
    });
  }

  // De lejos (arriba) a cerca (abajo): los cercanos tapan a los lejanos.
  plantados.sort((a, b) => a.y - b.y);
  return plantados;
}
