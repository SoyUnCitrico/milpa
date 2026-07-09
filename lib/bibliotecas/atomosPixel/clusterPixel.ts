// El grupo de partículas (port de PixelCluster.pde): construye un AtomoPixel
// por celda de `cellSize` píxeles de la imagen y orquesta las animaciones.
//
// Optimizaciones respecto al original:
//  - iniciarFrame()/terminarFrame(): el estado de p5 que comparten todas las
//    partículas de un frame (noStroke, tipografía CHAR, colorMode de HUECYCLE)
//    se fija UNA vez por frame, no por partícula.
//  - La grilla espacial del flock reutiliza los buckets y la lista de vecinos
//    entre frames (cero allocaciones por frame).
//  - Los píxeles de la imagen se leen del array plano RGBA (img.pixels).

import type p5 from "p5";
import type { ContextoAtomos, Limite, Barrido } from "./tipos";
import { AtomoPixel, type FrameDibujo } from "./atomoPixel";
import type { CampoFlujo } from "./campoFlujo";
import type { Repulsor } from "./repulsor";
import { rgbAHsb } from "./colorUtil";
import { AtlasGlifos } from "./atlasGlifos";

// Tamaño de celda de la grilla espacial del flock: igual al radio de vecindad
// máximo (50), así el bloque 3x3 cubre a todos los vecinos relevantes.
const FLOCK_CELL = 50;

export class ClusterPixel {
  private ctx: ContextoAtomos;
  cluster: AtomoPixel[] = [];
  cellSize: number;

  private noiseValue = 0;
  private noiseStep = 5;
  private shakeFactor = 100;

  // Buckets de la grilla del flock, reutilizados entre frames.
  private buckets: AtomoPixel[][] = [];
  private vecinos: AtomoPixel[] = [];
  // Atlas de glifos de la forma CHAR (compartido entre frames).
  private atlas = new AtlasGlifos();

  constructor(ctx: ContextoAtomos, picture: p5.Image, cellSize: number) {
    this.ctx = ctx;
    this.cellSize = cellSize;
    picture.loadPixels();
    const px = picture.pixels;
    for (let y = 0; y < picture.height; y += cellSize) {
      for (let x = 0; x < picture.width; x += cellSize) {
        const loc = 4 * (x + y * picture.width);
        const r = px[loc];
        const g = px[loc + 1];
        const b = px[loc + 2];
        const a = px[loc + 3];
        const [hue, sat, bright] = rgbAHsb(r, g, b);
        this.cluster.push(
          new AtomoPixel(ctx, x, y, cellSize, cellSize, r, g, b, a, hue, sat, bright),
        );
      }
    }
  }

  /**
   * Prepara el estado de p5 compartido por todas las partículas del frame,
   * según la forma activa. Llamar al inicio de cada método de animación.
   */
  iniciarFrame(): FrameDibujo {
    const p = this.ctx.p;
    const render = this.ctx.render;
    const shape = render.particleShape;
    p.noStroke();
    if (shape === "CHAR") {
      p.textFont(render.monoFont);
      p.textAlign(p.CENTER, p.CENTER);
      p.textStyle(render.textBold ? p.BOLD : p.NORMAL);
    } else if (shape === "HUECYCLE") {
      p.colorMode(p.HSB, 255);
    }
    return {
      shape,
      dynamic: render.dynamicSize,
      usePixelColor: render.textUsePixelColor(),
      frameHue: p.frameCount * 0.5,
      lastTextSize: -1,
      atlas: this.atlas,
    };
  }

  /** Restaura el estado global de p5 tras el frame. */
  terminarFrame(fc: FrameDibujo): void {
    const p = this.ctx.p;
    if (fc.shape === "HUECYCLE") p.colorMode(p.RGB, 255);
    if (fc.shape === "LINE") p.noStroke();
    if (fc.shape === "CHAR") {
      p.textStyle(p.NORMAL);
      (p.drawingContext as CanvasRenderingContext2D).globalAlpha = 1;
    }
  }

  initialPosition(): void {
    const fc = this.iniciarFrame();
    const c = this.cluster;
    for (let i = c.length - 1; i >= 0; i--) {
      const b = c[i];
      b.arrivarTarget(b.originalPosition.x, b.originalPosition.y, 35, "REVERSE_XY", fc);
      if (b.isDead()) c.splice(i, 1);
    }
    this.terminarFrame(fc);
  }

  /**
   * Barrido tipo "lluvia": cada partícula cae en la dirección elegida a su
   * PROPIA velocidad (sweepSpeed). Hacia abajo: lluvia con vida (mueren al
   * pasar el 70% del alto y renacen arriba); resto: caída recta envolviendo.
   */
  barrerCluster(barrerMode: Barrido): void {
    const fc = this.iniciarFrame();
    const c = this.cluster;
    if (barrerMode === "DOWN") {
      const deathY = this.ctx.H * 0.7;
      for (let i = 0; i < c.length; i++) {
        c[i].caerLluvia(c[i].sweepSpeed, deathY, fc);
      }
      this.terminarFrame(fc);
      return;
    }

    let dirX = 0;
    let dirY = 1;
    if (barrerMode === "LEFT") { dirX = -1; dirY = 0; }
    else if (barrerMode === "RIGHT") { dirX = 1; dirY = 0; }
    else if (barrerMode === "UP") { dirX = 0; dirY = -1; }
    for (let i = 0; i < c.length; i++) {
      c[i].caer(dirX, dirY, c[i].sweepSpeed, "OTHERSIDE", fc);
    }
    this.terminarFrame(fc);
  }

  temblarCluster(): void {
    const fc = this.iniciarFrame();
    const aumento = this.ctx.p.noise(this.noiseValue) * this.shakeFactor;
    const c = this.cluster;
    for (let i = c.length - 1; i >= 0; i--) {
      const b = c[i];
      b.temblar(aumento, this.shakeFactor / 2, "REVERSE_XY", fc);
      if (b.isDead()) c.splice(i, 1);
    }
    this.noiseValue += this.noiseStep;
    this.terminarFrame(fc);
  }

  seguirMouse(): void {
    const fc = this.iniciarFrame();
    const p = this.ctx.p;
    const c = this.cluster;
    for (let i = c.length - 1; i >= 0; i--) {
      const b = c[i];
      b.seguirTarget(p.mouseX, p.mouseY, "OTHERSIDE", fc);
      if (b.isDead()) c.splice(i, 1);
    }
    this.terminarFrame(fc);
  }

  arrivarMouse(): void {
    const fc = this.iniciarFrame();
    const p = this.ctx.p;
    const c = this.cluster;
    for (let i = c.length - 1; i >= 0; i--) {
      const b = c[i];
      b.arrivarTarget(p.mouseX, p.mouseY, 50.0, "OTHERSIDE", fc);
      if (b.isDead()) c.splice(i, 1);
    }
    this.terminarFrame(fc);
  }

  deambularCluster(limites: Limite): void {
    const fc = this.iniciarFrame();
    const c = this.cluster;
    for (let i = c.length - 1; i >= 0; i--) {
      const b = c[i];
      b.pasear(limites, fc);
      if (b.isDead()) c.splice(i, 1);
    }
    this.terminarFrame(fc);
  }

  atravesarCampo(campo: CampoFlujo, limites: Limite): void {
    const fc = this.iniciarFrame();
    const c = this.cluster;
    for (let i = c.length - 1; i >= 0; i--) {
      const b = c[i];
      b.seguirCampo(campo, limites, fc);
      if (b.isDead()) c.splice(i, 1);
    }
    this.terminarFrame(fc);
  }

  /**
   * Flock (boids) con grilla espacial: reparte las partículas en celdas de
   * FLOCK_CELL y solo busca vecinos en el bloque 3x3 (evita el O(n²)).
   */
  manadaCluster(limites: Limite): void {
    const fc = this.iniciarFrame();
    const W = this.ctx.W;
    const H = this.ctx.H;
    const gcols = Math.max(1, Math.ceil(W / FLOCK_CELL));
    const grows = Math.max(1, Math.ceil(H / FLOCK_CELL));
    const nCeldas = gcols * grows;

    // Reusa los buckets (vacía sin re-allocar).
    while (this.buckets.length < nCeldas) this.buckets.push([]);
    for (let i = 0; i < nCeldas; i++) this.buckets[i].length = 0;

    const c = this.cluster;
    for (let i = 0; i < c.length; i++) {
      const b = c[i];
      const gx = Math.min(gcols - 1, Math.max(0, Math.floor(b.position.x / FLOCK_CELL)));
      const gy = Math.min(grows - 1, Math.max(0, Math.floor(b.position.y / FLOCK_CELL)));
      this.buckets[gx + gy * gcols].push(b);
    }

    const vecinos = this.vecinos;
    for (let i = c.length - 1; i >= 0; i--) {
      const b = c[i];
      const gx = Math.min(gcols - 1, Math.max(0, Math.floor(b.position.x / FLOCK_CELL)));
      const gy = Math.min(grows - 1, Math.max(0, Math.floor(b.position.y / FLOCK_CELL)));

      vecinos.length = 0;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const nx = gx + ox;
          const ny = gy + oy;
          if (nx < 0 || ny < 0 || nx >= gcols || ny >= grows) continue;
          const bucket = this.buckets[nx + ny * gcols];
          for (let k = 0; k < bucket.length; k++) vecinos.push(bucket[k]);
        }
      }

      b.manadaSensor(vecinos, limites, fc);
      if (b.isDead()) c.splice(i, 1);
    }
    this.terminarFrame(fc);
  }

  /** Atrae (fuerza>0) o repele (fuerza<0) todas las partículas hacia un punto. */
  atraerCluster(px: number, py: number, fuerza: number, limites: Limite): void {
    const fc = this.iniciarFrame();
    const c = this.cluster;
    for (let i = c.length - 1; i >= 0; i--) {
      const b = c[i];
      b.atraerPunto(px, py, fuerza, limites, fc);
      if (b.isDead()) c.splice(i, 1);
    }
    this.terminarFrame(fc);
  }

  /** Hace orbitar todas las partículas alrededor de un centro (vórtice). */
  orbitarCluster(cx: number, cy: number, fuerza: number, limites: Limite): void {
    const fc = this.iniciarFrame();
    const c = this.cluster;
    for (let i = c.length - 1; i >= 0; i--) {
      const b = c[i];
      b.orbitarPunto(cx, cy, fuerza, limites, fc);
      if (b.isDead()) c.splice(i, 1);
    }
    this.terminarFrame(fc);
  }

  /** Impulso radial a todas las partículas desde un centro (una sola vez). */
  explotar(cx: number, cy: number, fuerza: number): void {
    for (const b of this.cluster) b.impulsar(cx, cy, fuerza);
  }

  /** Deja que las partículas deriven con su velocidad actual (tras explotar). */
  derivarCluster(limites: Limite): void {
    const fc = this.iniciarFrame();
    const c = this.cluster;
    for (let i = c.length - 1; i >= 0; i--) {
      const b = c[i];
      b.derivar(limites, fc);
      if (b.isDead()) c.splice(i, 1);
    }
    this.terminarFrame(fc);
  }

  reset(): void {
    for (const b of this.cluster) {
      b.setPosition(b.originalPosition.x, b.originalPosition.y);
    }
  }

  cambiarLifeMode(): void {
    for (const b of this.cluster) b.toggleLife();
  }

  /**
   * Aplica las fuerzas de los repulsores (explosiones) a las partículas dentro
   * de su radio. Solo acumula fuerza; la integra luego el comportamiento
   * activo, así la repulsión se SUMA a la del modo en el mismo frame.
   */
  applyRepulsors(rs: Repulsor[]): void {
    if (rs.length === 0) return;
    const c = this.cluster;
    for (let i = 0; i < c.length; i++) {
      const b = c[i];
      for (let k = 0; k < rs.length; k++) {
        const r = rs[k];
        const dx = b.position.x - r.x;
        const dy = b.position.y - r.y;
        if (dx * dx + dy * dy < r.radius * r.radius) {
          b.attract(r.x, r.y, -r.strength * r.falloff());
        }
      }
    }
  }

  /**
   * Llena cada partícula con una letra del texto (cicla el texto sobre todo el
   * cluster). Con texto vacío, vuelve al glifo por brillo (ASCII art).
   */
  setText(t: string): void {
    if (!t || t.length === 0) {
      for (const b of this.cluster) b.setGlyphFromBrightness();
      return;
    }
    let i = 0;
    for (const b of this.cluster) {
      b.glyph = t.charAt(i % t.length);
      i++;
    }
  }

  savePosition(): void {
    for (const b of this.cluster) b.saveStaticPosition();
  }

  changeSpeed(aumento: number): void {
    for (const b of this.cluster) b.setMaxSpeed(aumento);
  }

  size(): number {
    return this.cluster.length;
  }
}
