// Campo vectorial 2D (port de FlowField.pde): rejilla de vectores unitarios
// que guía a las partículas. Generadores: ruido Perlin, brillo de imagen,
// radial, circular, curvas paramétricas (corazón/infinito) y espiral de
// filotaxis. El cambio de campo puede ser inmediato o con transición suave
// (cada celda gira hacia su objetivo por el arco más corto).
//
// Optimizaciones: rejilla PLANA de {x,y} (índice i + j*cols, sin p5.Vector),
// transición mutando las celdas in place y lookup() sin copiar (los callers
// solo leen .x/.y).

import type p5 from "p5";
import type { ContextoAtomos, Vec2 } from "./tipos";
import { acotar, aleatorio, mapear } from "./colorUtil";

export class CampoFlujo {
  private ctx: ContextoAtomos;
  field: Vec2[];
  fieldTarget: Vec2[] | null = null;
  cols: number;
  rows: number;
  resolution: number;

  transitioning = false;
  /** Fracción del giro hacia el objetivo por frame (0..1). */
  transitionSpeed = 0.05;

  constructor(ctx: ContextoAtomos, imagen: p5.Image | null, resolution: number) {
    this.ctx = ctx;
    this.resolution = resolution;
    this.cols = Math.floor(ctx.W / resolution);
    this.rows = Math.floor(ctx.H / resolution);
    this.field = imagen ? this.buildImage(imagen) : this.buildNoise();
  }

  ///////////////////  GENERADORES DE CAMPO  ///////////////////

  private nuevaRejilla(): Vec2[] {
    const grid: Vec2[] = new Array(this.cols * this.rows);
    for (let i = 0; i < grid.length; i++) grid[i] = { x: 1, y: 0 };
    return grid;
  }

  /** Rejilla nueva a partir de ruido Perlin. */
  buildNoise(): Vec2[] {
    const p = this.ctx.p;
    const grid = this.nuevaRejilla();
    p.noiseSeed(Math.floor(aleatorio(0, 10000)));
    let xoff = 0;
    for (let i = 0; i < this.cols; i++) {
      let yoff = 0;
      for (let j = 0; j < this.rows; j++) {
        const theta = mapear(p.noise(xoff, yoff), 0, 1, 0, Math.PI * 2);
        const c = grid[i + j * this.cols];
        c.x = Math.cos(theta);
        c.y = Math.sin(theta);
        yoff += 0.1;
      }
      xoff += 0.1;
    }
    return grid;
  }

  /** Rejilla nueva a partir del brillo de la imagen. */
  buildImage(imagen: p5.Image): Vec2[] {
    const grid = this.nuevaRejilla();
    imagen.loadPixels();
    const px = imagen.pixels;
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const x = acotar(i * this.resolution, 0, imagen.width - 1);
        const y = acotar(j * this.resolution, 0, imagen.height - 1);
        const loc = 4 * (x + y * imagen.width);
        // brightness() de Processing = canal máximo.
        const bright = Math.max(px[loc], px[loc + 1], px[loc + 2]);
        const theta = mapear(bright, 0, 255, 0, Math.PI * 2);
        const c = grid[i + j * this.cols];
        c.x = Math.cos(theta);
        c.y = Math.sin(theta);
      }
    }
    return grid;
  }

  /** Campo radial: apunta hacia afuera del centro (o hacia adentro). */
  buildRadial(outward: boolean): Vec2[] {
    const grid = this.nuevaRejilla();
    const cx = this.ctx.W / 2;
    const cy = this.ctx.H / 2;
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        let dx = this.celdaX(i) - cx;
        let dy = this.celdaY(j) - cy;
        const m = Math.hypot(dx, dy);
        if (m < 0.001) {
          const ang = aleatorio(0, Math.PI * 2);
          dx = Math.cos(ang);
          dy = Math.sin(ang);
        } else {
          dx /= m;
          dy /= m;
        }
        if (!outward) {
          dx *= -1;
          dy *= -1;
        }
        const c = grid[i + j * this.cols];
        c.x = dx;
        c.y = dy;
      }
    }
    return grid;
  }

  /** Campo circular: tangente al círculo centrado en el canvas (remolino). */
  buildCircular(clockwise: boolean): Vec2[] {
    const grid = this.nuevaRejilla();
    const cx = this.ctx.W / 2;
    const cy = this.ctx.H / 2;
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const rx = this.celdaX(i) - cx;
        const ry = this.celdaY(j) - cy;
        // Tangente = radial rotado 90°.
        let tx = clockwise ? ry : -ry;
        let ty = clockwise ? -rx : rx;
        const m = Math.hypot(tx, ty);
        if (m < 0.001) {
          const ang = aleatorio(0, Math.PI * 2);
          tx = Math.cos(ang);
          ty = Math.sin(ang);
        } else {
          tx /= m;
          ty /= m;
        }
        const c = grid[i + j * this.cols];
        c.x = tx;
        c.y = ty;
      }
    }
    return grid;
  }

  private celdaX(i: number): number {
    return i * this.resolution + this.resolution / 2;
  }

  private celdaY(j: number): number {
    return j * this.resolution + this.resolution / 2;
  }

  // --- Campos con forma (curvas paramétricas) ---
  // Cada celda toma la TANGENTE del punto más cercano de la curva, más una
  // atracción hacia ese punto, de modo que las partículas se ciñen a la figura.
  // shape: 0 = corazón, 1 = infinito (lemniscata).
  buildParametric(shape: 0 | 1): Vec2[] {
    const grid = this.nuevaRejilla();
    const N = 360;
    const pts: Vec2[] = new Array(N);
    const tans: Vec2[] = new Array(N);
    for (let k = 0; k < N; k++) {
      const t = mapear(k, 0, N, 0, Math.PI * 2);
      pts[k] = this.curvePoint(shape, t);
      const nxt = this.curvePoint(shape, t + (Math.PI * 2) / N);
      let tx = nxt.x - pts[k].x;
      let ty = nxt.y - pts[k].y;
      const m = Math.hypot(tx, ty);
      if (m < 1e-6) {
        const ang = aleatorio(0, Math.PI * 2);
        tx = Math.cos(ang);
        ty = Math.sin(ang);
      } else {
        tx /= m;
        ty /= m;
      }
      tans[k] = { x: tx, y: ty };
    }
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const cx = this.celdaX(i);
        const cy = this.celdaY(j);
        let best = 0;
        let bd = Infinity;
        for (let k = 0; k < N; k++) {
          const dx = cx - pts[k].x;
          const dy = cy - pts[k].y;
          const dd = dx * dx + dy * dy;
          if (dd < bd) {
            bd = dd;
            best = k;
          }
        }
        let vx = tans[best].x;
        let vy = tans[best].y;
        let px = pts[best].x - cx; // atracción hacia la curva
        let py = pts[best].y - cy;
        const pm = Math.hypot(px, py);
        if (pm > 0.001) {
          px = (px / pm) * 0.6;
          py = (py / pm) * 0.6;
          vx += px;
          vy += py;
        }
        const vm = Math.hypot(vx, vy) || 1;
        const c = grid[i + j * this.cols];
        c.x = vx / vm;
        c.y = vy / vm;
      }
    }
    return grid;
  }

  /** Punto de la curva paramétrica en t∈[0,2π], en coords de pantalla. */
  private curvePoint(shape: 0 | 1, t: number): Vec2 {
    const W = this.ctx.W;
    const H = this.ctx.H;
    const base = Math.min(W, H) * 0.4;
    let mx: number;
    let my: number;
    if (shape === 0) {
      // Corazón clásico: lóbulos marcados arriba, punta abajo.
      mx = 16 * Math.pow(Math.sin(t), 3);
      my =
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t);
      mx /= 17.0;
      my /= 17.0;
      my += 0.1; // centra un poco verticalmente
    } else {
      // Infinito (lemniscata): lóbulos más grandes y separados.
      const d = 1 + Math.sin(t) * Math.sin(t);
      mx = (1.8 * Math.cos(t)) / d;
      my = (1.15 * Math.sin(t) * Math.cos(t)) / d;
    }
    // Math (Y arriba) -> pantalla (Y abajo).
    return { x: W / 2 + mx * base, y: H / 2 - my * base };
  }

  buildHeart(): Vec2[] {
    return this.buildParametric(0);
  }

  buildInfinity(): Vec2[] {
    return this.buildParametric(1);
  }

  /**
   * Campo espiral tipo FILOTAXIS (espiral de Fermat): el ángulo entre el flujo
   * y el radio crece con el radio (ψ = atan(2ρ²/a²)) — radial cerca del centro
   * y tangencial lejos, formando brazos que se abren hacia afuera.
   */
  buildSpiral(clockwise: boolean): Vec2[] {
    const grid = this.nuevaRejilla();
    const cx = this.ctx.W / 2;
    const cy = this.ctx.H / 2;
    const a = Math.min(this.ctx.W, this.ctx.H) * 0.35;
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        let rx = this.celdaX(i) - cx;
        let ry = this.celdaY(j) - cy;
        const rho = Math.hypot(rx, ry);
        const c = grid[i + j * this.cols];
        if (rho < 0.001) {
          const ang = aleatorio(0, Math.PI * 2);
          c.x = Math.cos(ang);
          c.y = Math.sin(ang);
          continue;
        }
        rx /= rho;
        ry /= rho;
        const tx = clockwise ? ry : -ry;
        const ty = clockwise ? -rx : rx;
        const psi = Math.atan2(2 * rho * rho, a * a); // 0 (centro) -> π/2 (lejos)
        let vx = rx * Math.cos(psi) + tx * Math.sin(psi);
        let vy = ry * Math.cos(psi) + ty * Math.sin(psi);
        const vm = Math.hypot(vx, vy) || 1;
        c.x = vx / vm;
        c.y = vy / vm;
      }
    }
    return grid;
  }

  ///////////////////  CAMBIO DE CAMPO  ///////////////////

  initNoise(): void {
    this.field = this.buildNoise();
    this.transitioning = false;
  }

  initImage(imagen: p5.Image): void {
    this.field = this.buildImage(imagen);
    this.transitioning = false;
  }

  transitionToNoise(): void {
    this.startTransition(this.buildNoise());
  }

  transitionToImage(imagen: p5.Image): void {
    this.startTransition(this.buildImage(imagen));
  }

  transitionToRadial(): void {
    this.startTransition(this.buildRadial(true));
  }

  transitionToCircular(): void {
    this.startTransition(this.buildCircular(false));
  }

  transitionToHeart(): void {
    this.startTransition(this.buildHeart());
  }

  transitionToInfinity(): void {
    this.startTransition(this.buildInfinity());
  }

  transitionToSpiral(): void {
    this.startTransition(this.buildSpiral(true));
  }

  startTransition(target: Vec2[]): void {
    this.fieldTarget = target;
    this.transitioning = true;
  }

  /**
   * Avanza la transición un paso (llamar una vez por frame): gira cada celda
   * hacia su objetivo por el arco más corto; al converger fija el objetivo.
   */
  update(): void {
    if (!this.transitioning || !this.fieldTarget) return;
    let done = true;
    for (let i = 0; i < this.field.length; i++) {
      const c = this.field[i];
      const t = this.fieldTarget[i];
      const a = Math.atan2(c.y, c.x);
      const b = Math.atan2(t.y, t.x);
      const diff = this.shortestAngle(a, b);
      if (Math.abs(diff) > 0.01) done = false;
      const ang = a + diff * this.transitionSpeed;
      c.x = Math.cos(ang);
      c.y = Math.sin(ang);
    }
    if (done) {
      this.field = this.fieldTarget;
      this.fieldTarget = null;
      this.transitioning = false;
    }
  }

  /** Diferencia angular más corta (con signo) de 'a' a 'b', en [-π, π]. */
  private shortestAngle(a: number, b: number): number {
    let diff = b - a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return diff;
  }

  ///////////////////  CONSULTA Y DIBUJO  ///////////////////

  /**
   * Vector de flujo de la celda que contiene (x, y). Devuelve la celda SIN
   * copiar: el caller solo debe leer .x/.y, nunca mutarla.
   */
  lookup(x: number, y: number): Vec2 {
    const col = acotar(Math.floor(x / this.resolution), 0, this.cols - 1);
    const row = acotar(Math.floor(y / this.resolution), 0, this.rows - 1);
    return this.field[col + row * this.cols];
  }

  /** Dibuja el campo completo como flechas (debug visual). */
  mostrarCampo(): void {
    const p = this.ctx.p;
    p.strokeWeight(1);
    p.stroke(255, 0, 0);
    const res = this.resolution;
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const x = i * res + res / 2;
        const y = j * res + res / 2;
        const v = this.field[i + j * this.cols];
        p.line(x, y, x + v.x * res, y + v.y * res);
      }
    }
    p.noStroke();
  }
}
