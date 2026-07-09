// Colonización de espacios 2D (port de SpaceColonization.pde, Runions et al.):
// las semillas son los píxeles cuyo brillo supera un umbral; desde ellas crece
// una red que coloniza el resto de los píxeles (atractores) y, al alcanzarlos,
// los "revela" con su color, reconstruyendo la imagen.
//
// Optimizaciones respecto al original (dos cuellos conocidos):
//  1. grow() era O(atractores × nodos): aquí una GRILLA ESPACIAL de nodos
//     (celda = attractionDist), actualizada incrementalmente —los nodos nunca
//     se mueven—, reduce la búsqueda del nodo más cercano al bloque 3×3.
//  2. draw() redibujaba TODAS las ramas y píxeles revelados cada frame: aquí
//     se pintan de forma INCREMENTAL en un buffer offscreen (p5.Graphics) y el
//     canvas recibe un único image() por frame.
//     Diferencia visible asumida: con fondo TRAILS/PERSIST la red ya no se
//     acumula con el velo (con CLEAR, el default, el resultado es idéntico).

import type p5 from "p5";
import type { ContextoAtomos } from "./tipos";

interface Atractor {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

interface NodoCrecimiento {
  x: number;
  y: number;
  parent: NodoCrecimiento | null;
  r: number;
  g: number;
  b: number;
}

export class Colonizacion {
  private ctx: ContextoAtomos;
  attractors: Atractor[] = []; // píxeles por colonizar
  nodes: NodoCrecimiento[] = []; // red de crecimiento
  revealedCount = 0;

  attractionDist: number;
  killDist: number;
  segLength: number;
  readonly maxNodes = 60000;
  /** Tamaño con el que se dibujan los píxeles revelados. */
  cell = 12;

  // Grilla espacial de nodos: celda = attractionDist; el bloque 3×3 cubre
  // cualquier vecino dentro del radio de atracción (y de kill, que es menor).
  private gcols: number;
  private grows: number;
  private gcell: number;
  private grid: NodoCrecimiento[][];

  // Buffer offscreen con la red dibujada hasta ahora (dibujo incremental).
  private buffer: p5.Graphics;

  // Reutilizado por grow() para agrupar direcciones por nodo influenciado.
  private dirs = new Map<NodoCrecimiento, { x: number; y: number }>();

  constructor(
    ctx: ContextoAtomos,
    datos: { x: number; y: number; r: number; g: number; b: number; bright: number }[],
    cellSize: number,
    threshold: number,
    attraction: number,
    kill: number,
    seg: number,
    buffer: p5.Graphics,
  ) {
    this.ctx = ctx;
    this.attractionDist = attraction;
    this.killDist = kill;
    this.segLength = seg;
    this.cell = cellSize;
    this.buffer = buffer;
    this.buffer.clear();
    this.buffer.noStroke();

    this.gcell = Math.max(1, attraction);
    this.gcols = Math.max(1, Math.ceil(ctx.W / this.gcell));
    this.grows = Math.max(1, Math.ceil(ctx.H / this.gcell));
    this.grid = new Array(this.gcols * this.grows);
    for (let i = 0; i < this.grid.length; i++) this.grid[i] = [];

    let masBrillante: (typeof datos)[number] | null = null;
    for (const d of datos) {
      if (!masBrillante || d.bright > masBrillante.bright) masBrillante = d;
      if (d.bright >= threshold) {
        // Semilla: nodo raíz, y se revela de entrada.
        this.agregarNodo({ x: d.x, y: d.y, parent: null, r: d.r, g: d.g, b: d.b });
        this.revelar({ x: d.x, y: d.y, r: d.r, g: d.g, b: d.b });
      } else {
        this.attractors.push({ x: d.x, y: d.y, r: d.r, g: d.g, b: d.b });
      }
    }

    // Si el umbral fue tan alto que no quedó ninguna semilla, usa el píxel más
    // brillante para que el crecimiento pueda arrancar igualmente.
    if (this.nodes.length === 0 && masBrillante) {
      const d = masBrillante;
      this.agregarNodo({ x: d.x, y: d.y, parent: null, r: d.r, g: d.g, b: d.b });
      this.revelar({ x: d.x, y: d.y, r: d.r, g: d.g, b: d.b });
    }

    // Revela los atractores que ya nacen pegados a una semilla.
    this.killReachedBy(this.nodes);
  }

  done(): boolean {
    return this.attractors.length === 0 || this.nodes.length >= this.maxNodes;
  }

  /** Una iteración del algoritmo. */
  grow(): void {
    if (this.done()) return;

    // 1) Cada atractor influye en el nodo más cercano dentro de attractionDist
    //    (búsqueda en el bloque 3×3 de la grilla espacial).
    const dirs = this.dirs;
    dirs.clear();
    const maxDist = this.attractionDist;
    for (const a of this.attractors) {
      const nearest = this.nodoMasCercano(a.x, a.y, maxDist);
      if (nearest) {
        let dx = a.x - nearest.x;
        let dy = a.y - nearest.y;
        const m = Math.hypot(dx, dy) || 1;
        dx /= m;
        dy /= m;
        const acc = dirs.get(nearest);
        if (acc) {
          acc.x += dx;
          acc.y += dy;
        } else {
          dirs.set(nearest, { x: dx, y: dy });
        }
      }
    }

    // 2) Crea un nodo nuevo por cada nodo influenciado, hacia el promedio, y
    //    dibuja su rama en el buffer (dibujo incremental).
    const nuevos: NodoCrecimiento[] = [];
    const buf = this.buffer;
    buf.strokeWeight(1);
    dirs.forEach((dir, n) => {
      const m = Math.hypot(dir.x, dir.y);
      if (m === 0) return;
      const nuevo: NodoCrecimiento = {
        x: n.x + (dir.x / m) * this.segLength,
        y: n.y + (dir.y / m) * this.segLength,
        parent: n,
        r: n.r,
        g: n.g,
        b: n.b,
      };
      nuevos.push(nuevo);
      this.agregarNodo(nuevo);
      buf.stroke(nuevo.r, nuevo.g, nuevo.b);
      buf.line(n.x, n.y, nuevo.x, nuevo.y);
    });
    buf.noStroke();

    // 3) Revela los atractores alcanzados por los nodos nuevos.
    this.killReachedBy(nuevos);
  }

  /** Vuelca al canvas la red dibujada hasta ahora (un solo blit). */
  draw(): void {
    this.ctx.p.image(this.buffer, 0, 0);
  }

  //////////////////  INTERNOS  //////////////////

  private agregarNodo(n: NodoCrecimiento): void {
    this.nodes.push(n);
    const gx = Math.min(this.gcols - 1, Math.max(0, Math.floor(n.x / this.gcell)));
    const gy = Math.min(this.grows - 1, Math.max(0, Math.floor(n.y / this.gcell)));
    this.grid[gx + gy * this.gcols].push(n);
  }

  /** Nodo más cercano a (x, y) dentro de maxDist, buscando en el bloque 3×3. */
  private nodoMasCercano(x: number, y: number, maxDist: number): NodoCrecimiento | null {
    const gx = Math.min(this.gcols - 1, Math.max(0, Math.floor(x / this.gcell)));
    const gy = Math.min(this.grows - 1, Math.max(0, Math.floor(y / this.gcell)));
    let best: NodoCrecimiento | null = null;
    let bd2 = maxDist * maxDist;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const nx = gx + ox;
        const ny = gy + oy;
        if (nx < 0 || ny < 0 || nx >= this.gcols || ny >= this.grows) continue;
        const celda = this.grid[nx + ny * this.gcols];
        for (let k = 0; k < celda.length; k++) {
          const n = celda[k];
          const dx = x - n.x;
          const dy = y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bd2) {
            bd2 = d2;
            best = n;
          }
        }
      }
    }
    return best;
  }

  /** Pinta un atractor alcanzado en el buffer (píxel revelado). */
  private revelar(a: { x: number; y: number; r: number; g: number; b: number }): void {
    this.buffer.fill(a.r, a.g, a.b);
    this.buffer.ellipse(a.x, a.y, this.cell, this.cell);
    this.revealedCount++;
  }

  /** Revela y elimina los atractores a menos de killDist de algún nodo dado. */
  private killReachedBy(checkNodes: NodoCrecimiento[]): void {
    if (checkNodes.length === 0 || this.attractors.length === 0) return;
    const kd2 = this.killDist * this.killDist;

    // Grilla temporal de los nodos a comprobar (pocos por frame), para no
    // hacer atractores × nodos: cada atractor solo mira su vecindario.
    const celda = Math.max(1, this.killDist);
    const cols = Math.max(1, Math.ceil(this.ctx.W / celda));
    const rows = Math.max(1, Math.ceil(this.ctx.H / celda));
    const mini = new Map<number, NodoCrecimiento[]>();
    for (const n of checkNodes) {
      const gx = Math.min(cols - 1, Math.max(0, Math.floor(n.x / celda)));
      const gy = Math.min(rows - 1, Math.max(0, Math.floor(n.y / celda)));
      const idx = gx + gy * cols;
      const lista = mini.get(idx);
      if (lista) lista.push(n);
      else mini.set(idx, [n]);
    }

    const vivos: Atractor[] = [];
    for (const a of this.attractors) {
      const gx = Math.min(cols - 1, Math.max(0, Math.floor(a.x / celda)));
      const gy = Math.min(rows - 1, Math.max(0, Math.floor(a.y / celda)));
      let alcanzado = false;
      busqueda: for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const nx = gx + ox;
          const ny = gy + oy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const lista = mini.get(nx + ny * cols);
          if (!lista) continue;
          for (const n of lista) {
            const dx = a.x - n.x;
            const dy = a.y - n.y;
            if (dx * dx + dy * dy < kd2) {
              alcanzado = true;
              break busqueda;
            }
          }
        }
      }
      if (alcanzado) this.revelar(a);
      else vivos.push(a);
    }
    this.attractors = vivos;
  }
}
