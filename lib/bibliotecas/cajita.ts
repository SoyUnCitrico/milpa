import type p5 from "p5";
import type { Colisionador } from "./colisionador";

/**
 * Solapamiento círculo-rectángulo (reimplementa `collideRectCircle` de
 * p5.collide2d, que no está en el core). Rectángulo en esquina (x,y).
 */
function colisionRectCirculo(
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  cx: number,
  cy: number,
  diametro: number,
): boolean {
  const testX = cx < rx ? rx : cx > rx + rw ? rx + rw : cx;
  const testY = cy < ry ? ry : cy > ry + rh ? ry + rh : cy;
  const distX = cx - testX;
  const distY = cy - testY;
  return Math.sqrt(distX * distX + distY * distY) <= diametro / 2;
}

/**
 * Caja móvil del `soundCollider`, portada de
 * `Talleres2021-CC2/.../libraries/CajitaCollide.js` a modo instancia y
 * reelaborada:
 *   - Se mueve a la derecha (con factor de velocidad propio) y DERIVA en Y con
 *     ruido Perlin, así las cajas no son estáticas ni van en filas fijas.
 *   - Su TAMAÑO determina la nota (la calcula el sketch a partir de `tam()`).
 *   - Ya no dispara audio: solo expone `chocaCon()` (test puro) y `setHit()`
 *     (parpadeo). El disparo con detección de flanco lo hace el sketch, usando
 *     `colisionesPrevias` para no retriggerear cada frame.
 */
export class Cajita {
  p: p5;
  x: number;
  y: number;
  baseY: number;
  w: number;
  h: number;
  id: number;
  colorBase: p5.Color;
  colorHit: p5.Color;
  private hit: boolean;
  private velFactor: number;
  private faseRuido: number;
  private driftY: number;
  /** Ids de colisionadores con los que ya estaba chocando el frame anterior. */
  colisionesPrevias: Set<number>;

  constructor(p: p5, x: number, y: number, w: number, h: number, id: number, colorHex: string) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.w = w;
    this.h = h;
    this.id = id;
    this.colorBase = p.color(colorHex);
    this.colorBase.setAlpha(120);
    this.colorHit = p.color("#00ff41");
    this.hit = false;
    this.velFactor = p.random(0.6, 1.4);
    this.faseRuido = p.random(1000);
    this.driftY = p.random(40, 120);
    this.colisionesPrevias = new Set();
  }

  /** Tamaño representativo (promedio ancho/alto) para mapear a nota. */
  tam(): number {
    return (this.w + this.h) / 2;
  }

  actualizar(velBase: number) {
    const p = this.p;
    this.x += velBase * this.velFactor;
    if (this.x > p.width) this.x = -this.w;
    this.faseRuido += 0.006;
    this.y = this.baseY + (p.noise(this.faseRuido) - 0.5) * this.driftY;
  }

  chocaCon(obj: Colisionador): boolean {
    return colisionRectCirculo(this.x, this.y, this.w, this.h, obj.x, obj.y, obj.dia);
  }

  setHit(hit: boolean) {
    this.hit = hit;
  }

  mostrar() {
    const p = this.p;
    p.push();
    p.noStroke();
    if (this.hit) {
      const glow = p.color("#00ff41");
      glow.setAlpha(60);
      p.fill(glow);
      p.rect(this.x - 4, this.y - 4, this.w + 8, this.h + 8);
    }
    p.fill(this.hit ? this.colorHit : this.colorBase);
    p.rect(this.x, this.y, this.w, this.h);
    p.pop();
  }
}
