import type p5 from "p5";
import type { Colisionador } from "./colisionador";

/** Callback que dispara la caja al ser golpeada (desacopla el audio del sketch). */
export type OnHitCajita = (nota: number, freq: number) => void;

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

/** Solapamiento rectángulo-rectángulo (AABB), reimplementa `collideRectRect`. */
function colisionRectRect(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number,
): boolean {
  return x1 + w1 >= x2 && x1 <= x2 + w2 && y1 + h1 >= y2 && y1 <= y2 + h2;
}

/**
 * Caja móvil del `soundCollider`, portada de
 * `Talleres2021-CC2/.../libraries/CajitaCollide.js` (clase `Cajita`) a modo
 * instancia. Avanza a la derecha y reaparece por la izquierda; al chocar con un
 * `Colisionador` cambia de color y dispara el sonido vía `onHit` (en el original
 * llamaba directamente a los globales de audio del sketch; aquí se desacopla).
 */
export class Cajita {
  p: p5;
  x: number;
  y: number;
  w: number;
  h: number;
  color: p5.Color;
  colorOriginal: p5.Color;
  hit: boolean;
  id: number;
  note: number;
  velocidad: number;
  freq: number;
  onHit: OnHitCajita;

  constructor(
    p: p5,
    x: number,
    y: number,
    w: number,
    h: number,
    id: number,
    onHit: OnHitCajita = () => {},
  ) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = p.color(p.random(0, 150), p.random(80, 200), p.random(80, 220));
    this.colorOriginal = this.color;
    this.hit = false;
    this.id = id || 0;
    this.note = Math.floor(p.random(40, 88));
    this.velocidad = 1;
    this.freq = 440;
    this.onHit = onHit;
  }

  revisarSuperposicion(objArray: Cajita[]) {
    const p = this.p;
    for (let i = 0; i < objArray.length; i++) {
      if (this.id !== i) {
        const colision = colisionRectRect(
          this.x, this.y, this.w, this.h,
          objArray[i].x, objArray[i].y, objArray[i].w, objArray[i].h,
        );
        if (colision) {
          this.x = p.random(p.width);
          this.y = p.random(p.height);
        }
      }
    }
  }

  revisaColision(obj: Colisionador) {
    this.hit = colisionRectCirculo(this.x, this.y, this.w, this.h, obj.x, obj.y, obj.dia);
    if (this.hit) {
      this.color = obj.col;
      this.freq = obj.freq;
      this.onHit(this.note, obj.freq);
    } else {
      this.color = this.colorOriginal;
    }
  }

  mostrar() {
    const p = this.p;
    p.noStroke();
    p.fill(this.color);
    this.actualizar();
    p.rect(this.x, this.y, this.w, this.h);
  }

  actualizar() {
    this.x += this.velocidad;
    if (this.x > this.p.width) {
      this.x = -this.w;
    }
  }

  setVelocidad(vel: number) {
    this.velocidad = vel;
  }
}
