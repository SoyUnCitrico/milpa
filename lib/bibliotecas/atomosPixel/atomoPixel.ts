// La partícula (port de PixelAtom.pde): steering behaviors clásicos (Reynolds /
// Nature of Code), sistema de vida y dibujo con 9 formas moduladas por los
// datos HSB del píxel original.
//
// Optimizaciones respecto al original (mismo resultado numérico/visual):
//  - Todo el steering usa aritmética escalar sobre .x/.y (el original crea
//    varios PVector por partícula y frame; aquí no se alloca nada por frame).
//  - Los valores de dibujo que dependen solo del píxel (ángulo y largo de LINE,
//    esquinas rotadas de RECT, color HUESQUARE, alfas de CIRCLE/TRIANGLE) se
//    precomputan una vez en el constructor.
//  - El estado de p5 compartido por frame (forma, tipografía, colorMode) lo
//    fija ClusterPixel.iniciarFrame(), no cada partícula (ver FrameDibujo).

import type { ContextoAtomos, Forma, Limite, Vec2 } from "./tipos";
import { acotar, aleatorio, hsbARgb, mapear } from "./colorUtil";
import type { CampoFlujo } from "./campoFlujo";
import type { AtlasGlifos } from "./atlasGlifos";

/** Rampa ASCII por brillo (oscuro = poco denso, brillante = denso). */
const RAMPA_ASCII = " .:-=+*#%@";

/**
 * Contexto de UN frame de dibujo, preparado por ClusterPixel.iniciarFrame():
 * evita leer/ajustar el estado global de p5 por partícula.
 */
export interface FrameDibujo {
  shape: Forma;
  dynamic: boolean;
  /** CHAR: ¿cada letra usa el color original de su píxel? */
  usePixelColor: boolean;
  /** HUECYCLE: desplazamiento de matiz del frame (frameCount * 0.5). */
  frameHue: number;
  /**
   * CHAR: último textSize aplicado en este frame. Cambiar ctx.font es lo más
   * caro del render de texto; el tamaño se cuantiza a pasos de 2px y solo se
   * llama a textSize cuando cambia respecto a la partícula anterior.
   */
  lastTextSize: number;
  /** CHAR: atlas de glifos rasterizados (drawImage en vez de fillText). */
  atlas: AtlasGlifos;
}

export class AtomoPixel {
  private ctx: ContextoAtomos;

  w: number;
  h: number;

  life = 100;
  damage = 0.1;
  /** Velocidad máxima del movimiento. */
  maxSpeed = 4;
  /** Fuerza máxima de dirección (steering). */
  maxForce = 0.5;
  wanderTheta = 0;
  /** Velocidad propia de caída en el barrido tipo lluvia (modo SWEEP). */
  sweepSpeed: number;

  position: Vec2;
  originalPosition: Vec2;
  staticPosition: Vec2 = { x: 0, y: 0 };
  velocity: Vec2;
  acceleration: Vec2 = { x: 0, y: 0 };

  isLiving = false;

  // Piel actual (puede modificarla la vida) y original del píxel.
  r: number;
  g: number;
  b: number;
  a: number;
  or: number;
  og: number;
  ob: number;
  oa: number;

  // Datos HSB del píxel original (0..255), para las formas de composición.
  pixHue: number;
  pixSat: number;
  pixBright: number;

  /** Letra que dibuja la partícula en forma CHAR (ASCII/Matrix). */
  glyph = " ";

  // --- Precomputados por forma (dependen solo del píxel, no del frame) ---
  private hueR: number; // HUESQUARE: color de la escala de hue
  private hueG: number;
  private hueB: number;
  private lineCos: number; // LINE: saturación -> ángulo
  private lineSin: number;
  private lineLen: number; // LINE: brillo -> longitud
  private lineW: number; //   LINE: brillo -> grosor
  private circDiam: number; // CIRCLE: brillo -> diámetro
  private circAlpha: number; // CIRCLE: saturación -> opacidad
  private triAlpha: number; // TRIANGLE: brillo -> opacidad
  private quadOff: number[]; // RECT: 4 esquinas rotadas (matiz -> ángulo)

  constructor(
    ctx: ContextoAtomos,
    x: number,
    y: number,
    ancho: number,
    alto: number,
    r: number,
    g: number,
    b: number,
    a: number,
    pixHue: number,
    pixSat: number,
    pixBright: number,
  ) {
    this.ctx = ctx;
    this.w = ancho;
    this.h = alto;
    this.position = { x, y };
    this.originalPosition = { x, y };
    // Igual que initPixel(): dirección inicial aleatoria unitaria.
    const vx = aleatorio(-5, 5);
    const vy = aleatorio(-5, 5);
    const vm = Math.hypot(vx, vy) || 1;
    this.velocity = { x: vx / vm, y: vy / vm };
    this.sweepSpeed = aleatorio(1.5, 6.0);

    this.r = this.or = r;
    this.g = this.og = g;
    this.b = this.ob = b;
    this.a = this.oa = a;
    this.pixHue = pixHue;
    this.pixSat = pixSat;
    this.pixBright = pixBright;
    this.setGlyphFromBrightness();

    // HUESQUARE: matiz del píxel a saturación plena y brillo según el propio
    // matiz (era colorMode(HSB) + color(...) por átomo en el original).
    const [hr, hg, hb] = hsbARgb(pixHue, 255, mapear(pixHue, 0, 255, 80, 255));
    this.hueR = hr;
    this.hueG = hg;
    this.hueB = hb;

    // LINE: brillo -> longitud/grosor; saturación -> ángulo.
    const angLinea = mapear(pixSat, 0, 255, 0, Math.PI * 2);
    this.lineCos = Math.cos(angLinea);
    this.lineSin = Math.sin(angLinea);
    this.lineLen = mapear(pixBright, 0, 255, 1, ancho * 1.8);
    this.lineW = mapear(pixBright, 0, 255, 0.5, 3);

    // CIRCLE / TRIANGLE: alfas y diámetro fijos por píxel.
    this.circDiam = mapear(pixBright, 0, 255, 1, ancho * 1.4);
    this.circAlpha = mapear(pixSat, 0, 255, 60, 255);
    this.triAlpha = mapear(pixBright, 0, 255, 30, 255);

    // RECT: brillo -> ancho, saturación -> alto, matiz -> ángulo. Se guardan
    // las 4 esquinas ya rotadas (a escala 1) y drawPixel solo las traslada.
    const rw = mapear(pixBright, 0, 255, 2, ancho * 1.6) / 2;
    const rh = mapear(pixSat, 0, 255, 2, ancho * 1.6) / 2;
    const angRect = mapear(pixHue, 0, 255, 0, Math.PI * 2);
    const c = Math.cos(angRect);
    const s = Math.sin(angRect);
    this.quadOff = [
      -rw * c - -rh * s, -rw * s + -rh * c, //  (-rw, -rh)
      rw * c - -rh * s, rw * s + -rh * c, //  ( rw, -rh)
      rw * c - rh * s, rw * s + rh * c, //  ( rw,  rh)
      -rw * c - rh * s, -rw * s + rh * c, //  (-rw,  rh)
    ];
  }

  /** Asigna la letra según el brillo del píxel (degradado ASCII). */
  setGlyphFromBrightness(): void {
    const idx = acotar(
      Math.floor(mapear(this.pixBright, 0, 255, 0, RAMPA_ASCII.length - 1)),
      0,
      RAMPA_ASCII.length - 1,
    );
    this.glyph = RAMPA_ASCII.charAt(idx);
  }

  ///////////////////  API (comportamiento + integración + dibujo)  ////////////

  seguirTarget(tx: number, ty: number, limites: Limite, fc: FrameDibujo): void {
    this.seek(tx, ty);
    this.actualizar();
    this.checkLimits(limites);
    if (this.isLiving) this.living();
    this.drawPixel(fc);
  }

  arrivarTarget(
    tx: number,
    ty: number,
    targetRadius: number,
    limites: Limite,
    fc: FrameDibujo,
  ): void {
    this.arrive(tx, ty, targetRadius);
    this.actualizar();
    this.checkLimits(limites);
    if (this.isLiving) this.living();
    this.drawPixel(fc);
  }

  temblar(movement: number, offset: number, limites: Limite, fc: FrameDibujo): void {
    this.position.x = this.staticPosition.x + movement - offset;
    this.position.y = this.staticPosition.y;
    this.actualizar();
    this.checkLimits(limites);
    if (this.isLiving) this.living();
    this.drawPixel(fc);
  }

  pasear(limites: Limite, fc: FrameDibujo): void {
    this.wander();
    this.actualizar();
    this.checkLimits(limites);
    if (this.isLiving) this.living();
    this.drawPixel(fc);
  }

  /**
   * Cae en línea recta hacia (dirX, dirY) —unitario— a `speed` px/frame
   * (velocidad propia, sin el tope de maxSpeed), para el barrido tipo lluvia.
   */
  caer(dirX: number, dirY: number, speed: number, limites: Limite, fc: FrameDibujo): void {
    this.velocity.x = dirX * speed;
    this.velocity.y = dirY * speed;
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.acceleration.x = 0;
    this.acceleration.y = 0;
    this.checkLimits(limites);
    if (this.isLiving) this.living();
    this.drawPixel(fc);
  }

  /**
   * Lluvia hacia abajo con vida: al pasar `deathY` se desvanece a lo largo de
   * la franja inferior; al llegar a vida 0 renace arriba y vuelve a caer.
   */
  caerLluvia(speed: number, deathY: number, fc: FrameDibujo): void {
    this.velocity.x = 0;
    this.velocity.y = speed;
    this.position.y += speed;
    this.acceleration.x = 0;
    this.acceleration.y = 0;

    if (this.position.y > deathY) {
      const region = Math.max(1, this.ctx.H - deathY);
      this.life -= (100.0 * speed) / region;
    }
    this.mapLifeToAlpha();

    if (this.isDead()) this.renacer();
    this.drawPixel(fc);
  }

  /** Reaparece por encima del borde superior con vida y color plenos. */
  renacer(): void {
    this.position.y = -aleatorio(0, this.ctx.H * 0.3);
    this.life = 100;
    this.r = this.or;
    this.g = this.og;
    this.b = this.ob;
    this.a = this.oa;
  }

  seguirCampo(campo: CampoFlujo, limites: Limite, fc: FrameDibujo): void {
    const v = campo.lookup(this.position.x, this.position.y);
    this.aplicarSteer(v.x * this.maxSpeed, v.y * this.maxSpeed, 1);
    this.actualizar();
    this.checkLimits(limites);
    if (this.isLiving) this.living();
    this.drawPixel(fc);
  }

  manadaSensor(vecinos: AtomoPixel[], limites: Limite, fc: FrameDibujo): void {
    this.flock(vecinos);
    this.actualizar();
    this.checkLimits(limites);
    if (this.isLiving) this.living();
    this.drawPixel(fc);
  }

  /** Atracción/repulsión hacia un punto (fuerza>0 atrae, fuerza<0 repele). */
  atraerPunto(px: number, py: number, fuerza: number, limites: Limite, fc: FrameDibujo): void {
    this.attract(px, py, fuerza);
    this.actualizar();
    this.checkLimits(limites);
    if (this.isLiving) this.living();
    this.drawPixel(fc);
  }

  /** Giro alrededor de un centro (efecto vórtice). */
  orbitarPunto(cx: number, cy: number, fuerza: number, limites: Limite, fc: FrameDibujo): void {
    this.orbit(cx, cy, fuerza);
    this.actualizar();
    this.checkLimits(limites);
    if (this.isLiving) this.living();
    this.drawPixel(fc);
  }

  /** Deriva libre con fricción, sin nuevas fuerzas (tras un impulso). */
  derivar(limites: Limite, fc: FrameDibujo): void {
    this.velocity.x *= 0.97;
    this.velocity.y *= 0.97;
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.acceleration.x = 0;
    this.acceleration.y = 0;
    this.checkLimits(limites);
    if (this.isLiving) this.living();
    this.drawPixel(fc);
  }

  /** Impulso radial instantáneo desde un centro (no dibuja). */
  impulsar(cx: number, cy: number, fuerza: number): void {
    let dx = this.position.x - cx;
    let dy = this.position.y - cy;
    const m = Math.hypot(dx, dy);
    if (m < 0.001) {
      const ang = aleatorio(0, Math.PI * 2);
      dx = Math.cos(ang);
      dy = Math.sin(ang);
    } else {
      dx /= m;
      dy /= m;
    }
    this.velocity.x = dx * fuerza;
    this.velocity.y = dy * fuerza;
  }

  //////////////////////  DIBUJO  ////////////////////

  drawPixel(fc: FrameDibujo): void {
    const p = this.ctx.p;
    const x = this.position.x;
    const y = this.position.y;

    let factor = 1.0;
    if (fc.dynamic) {
      const vm = Math.hypot(this.velocity.x, this.velocity.y);
      factor = acotar(mapear(vm, 0, this.maxSpeed, 0.4, 1.6), 0.4, 1.6);
    }

    switch (fc.shape) {
      case "ELLIPSE":
        p.fill(this.r, this.g, this.b, this.a);
        p.ellipse(x, y, this.w * factor, this.h * factor);
        break;

      case "LINE": {
        // Endpoints directos con el cos/sin precomputado (sin push/rotate).
        const k = (this.lineLen * factor) / 2;
        p.stroke(this.r, this.g, this.b, this.a);
        p.strokeWeight(this.lineW);
        p.line(x - k * this.lineCos, y - k * this.lineSin, x + k * this.lineCos, y + k * this.lineSin);
        break;
      }

      case "CIRCLE": {
        const d = this.circDiam * factor;
        p.fill(this.r, this.g, this.b, this.circAlpha);
        p.ellipse(x, y, d, d);
        break;
      }

      case "RECT": {
        // Esquinas rotadas precomputadas (sin push/rotate/rectMode).
        const q = this.quadOff;
        const f = factor;
        p.fill(this.r, this.g, this.b, this.a);
        p.quad(
          x + q[0] * f, y + q[1] * f,
          x + q[2] * f, y + q[3] * f,
          x + q[4] * f, y + q[5] * f,
          x + q[6] * f, y + q[7] * f,
        );
        break;
      }

      case "CHAR": {
        // Cada partícula es una letra; el brillo del píxel modula tamaño y
        // opacidad (oscuro = grande y opaca) para que la figura siga legible.
        if (this.glyph === " ") break; // un espacio no pinta nada: ahórralo
        const rdr = this.ctx.render;
        const sizeF = mapear(this.pixBright, 0, 255, rdr.charSizeDark, rdr.charSizeBright);
        // Cuantizado a pasos de 2px para reutilizar rasterizados entre letras.
        const px = Math.max(
          2,
          Math.round((this.w * rdr.textSizeScale * sizeF * factor) / 2) * 2,
        );
        if (fc.usePixelColor) {
          // Color por píxel: cada letra es distinta, sin atlas (fillText).
          // La tipografía/alineación/estilo las fijó iniciarFrame().
          if (px !== fc.lastTextSize) {
            p.textSize(px);
            fc.lastTextSize = px;
          }
          p.fill(this.r, this.g, this.b, this.a);
          p.text(this.glyph, x, y);
        } else {
          // Color de preset: glifo rasterizado una vez y pintado con
          // drawImage + globalAlpha (mucho más barato que fillText ×6400).
          const alfa = mapear(this.pixBright, 0, 255, rdr.charAlphaDark, rdr.charAlphaBright);
          const tc = rdr.textColor;
          const img = fc.atlas.obtener(this.glyph, px, rdr.textBold, tc[0], tc[1], tc[2]);
          const ctx2d = p.drawingContext as CanvasRenderingContext2D;
          ctx2d.globalAlpha = alfa / 255;
          ctx2d.drawImage(img, x - img.width / 2, y - img.height / 2);
        }
        break;
      }

      case "TRIANGLE": {
        const s = this.w * 0.7 * factor;
        p.fill(this.r, this.g, this.b, this.triAlpha);
        p.triangle(x, y - s, x - s, y + s, x + s, y + s);
        break;
      }

      case "HUESQUARE":
        p.fill(this.hueR, this.hueG, this.hueB);
        p.rect(x, y, this.w * factor, this.h * factor);
        break;

      case "HUECYCLE": {
        // iniciarFrame() dejó colorMode(HSB, 255) activo para todo el frame.
        const hv = (this.pixHue + fc.frameHue) % 255;
        p.fill(hv, this.pixSat, this.pixBright);
        p.rect(x, y, this.w * factor, this.h * factor);
        break;
      }

      case "SQUARE":
      default:
        p.fill(this.r, this.g, this.b, this.a);
        p.rect(x, y, this.w * factor, this.h * factor);
        break;
    }
  }

  /////////////////  VIDA  /////////////////

  living(): void {
    this.life -= this.damage;
    this.mapLifeToAlpha();
  }

  mapLifeToAlpha(): void {
    this.a = mapear(this.life, 0, 100, 0, this.oa);
  }

  isDead(): boolean {
    return this.life < 0.0;
  }

  //////////////// Getters && Setters ////////////////

  setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  setMaxSpeed(speedStep: number): void {
    this.maxSpeed += speedStep;
  }

  saveStaticPosition(): void {
    this.staticPosition.x = this.position.x;
    this.staticPosition.y = this.position.y;
  }

  toggleLife(): void {
    this.isLiving = !this.isLiving;
  }

  //////////////////   MOVIMIENTO  ////////////////

  applyForce(fx: number, fy: number): void {
    this.acceleration.x += fx;
    this.acceleration.y += fy;
  }

  /** velocidad += aceleración (limitada a maxSpeed); posición += velocidad. */
  actualizar(): void {
    const v = this.velocity;
    v.x += this.acceleration.x;
    v.y += this.acceleration.y;
    const max = this.maxSpeed;
    const m2 = v.x * v.x + v.y * v.y;
    if (m2 > max * max) {
      const m = Math.sqrt(m2);
      v.x = (v.x / m) * max;
      v.y = (v.y / m) * max;
    }
    this.position.x += v.x;
    this.position.y += v.y;
    this.acceleration.x = 0;
    this.acceleration.y = 0;
  }

  /**
   * Aplica el steering de Reynolds hacia un vector deseado (dx, dy) ya escalado
   * a maxSpeed: steering = deseado - velocidad, limitado a maxForce y pesado.
   */
  private aplicarSteer(dx: number, dy: number, peso: number): void {
    let sx = dx - this.velocity.x;
    let sy = dy - this.velocity.y;
    const f = this.maxForce;
    const m2 = sx * sx + sy * sy;
    if (m2 > f * f) {
      const m = Math.sqrt(m2);
      sx = (sx / m) * f;
      sy = (sy / m) * f;
    }
    this.acceleration.x += sx * peso;
    this.acceleration.y += sy * peso;
  }

  arrive(tx: number, ty: number, distance: number): void {
    let dx = tx - this.position.x;
    let dy = ty - this.position.y;
    const d = Math.hypot(dx, dy);
    if (d > 0) {
      dx /= d;
      dy /= d;
    }
    // Cerca del objetivo la velocidad deseada decae proporcionalmente.
    const m = d < distance ? mapear(d, 0, distance, 0, this.maxSpeed) : this.maxSpeed;
    this.aplicarSteer(dx * m, dy * m, 1);
  }

  seek(tx: number, ty: number): void {
    let dx = tx - this.position.x;
    let dy = ty - this.position.y;
    const m = Math.hypot(dx, dy);
    if (m > 0) {
      dx = (dx / m) * this.maxSpeed;
      dy = (dy / m) * this.maxSpeed;
    }
    this.aplicarSteer(dx, dy, 1);
  }

  /**
   * Boids: separación + alineación + cohesión + wander, en UNA sola pasada
   * sobre los vecinos (el original recorría la lista tres veces).
   * Pesos idénticos: sep 1.8, ali 1.1, coh 0.8, wander 0.5.
   */
  flock(vecinos: AtomoPixel[]): void {
    const SEP = 25.0;
    const VECINDAD = 50.0;
    const px = this.position.x;
    const py = this.position.y;

    let sepX = 0, sepY = 0, nSep = 0;
    let aliX = 0, aliY = 0, nAli = 0;
    let cohX = 0, cohY = 0;

    for (let i = 0; i < vecinos.length; i++) {
      const otro = vecinos[i];
      const dx = px - otro.position.x;
      const dy = py - otro.position.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 0 || d2 >= VECINDAD * VECINDAD) continue;
      const d = Math.sqrt(d2);
      if (d < SEP) {
        // Vector de huida normalizado y pesado por 1/d.
        sepX += dx / d2; // (dx/d)/d
        sepY += dy / d2;
        nSep++;
      }
      aliX += otro.velocity.x;
      aliY += otro.velocity.y;
      cohX += otro.position.x;
      cohY += otro.position.y;
      nAli++;
    }

    // Separación: promedio -> normalizar a maxSpeed -> steering (peso 1.8).
    if (nSep > 0) {
      sepX /= nSep;
      sepY /= nSep;
    }
    const sm = Math.hypot(sepX, sepY);
    if (sm > 0) {
      this.aplicarSteer((sepX / sm) * this.maxSpeed, (sepY / sm) * this.maxSpeed, 1.8);
    }

    if (nAli > 0) {
      // Alineación: velocidad promedio normalizada a maxSpeed (peso 1.1).
      const am = Math.hypot(aliX, aliY);
      if (am > 0) {
        this.aplicarSteer((aliX / am) * this.maxSpeed, (aliY / am) * this.maxSpeed, 1.1);
      }
      // Cohesión: seek hacia el centro del grupo (peso 0.8).
      const gx = cohX / nAli - px;
      const gy = cohY / nAli - py;
      const gm = Math.hypot(gx, gy);
      if (gm > 0) {
        this.aplicarSteer((gx / gm) * this.maxSpeed, (gy / gm) * this.maxSpeed, 0.8);
      }
    }

    // Deriva orgánica que evita que el enjambre se congele (peso 0.5).
    this.wanderSteer(0.5);
  }

  /** Wander clásico: un objetivo sobre un círculo por delante de la velocidad. */
  private wanderSteer(peso: number): void {
    const wanderR = 25;
    const wanderD = 80;
    this.wanderTheta += aleatorio(-0.3, 0.3);

    let hx = this.velocity.x;
    let hy = this.velocity.y;
    const hm = Math.hypot(hx, hy);
    if (hm < 0.001) {
      const ang = aleatorio(0, Math.PI * 2);
      hx = Math.cos(ang);
      hy = Math.sin(ang);
    } else {
      hx /= hm;
      hy /= hm;
    }
    const cx = this.position.x + hx * wanderD;
    const cy = this.position.y + hy * wanderD;

    const h = Math.atan2(this.velocity.y, this.velocity.x);
    const tx = cx + wanderR * Math.cos(this.wanderTheta + h);
    const ty = cy + wanderR * Math.sin(this.wanderTheta + h);

    // seek hacia el objetivo del círculo de wander, con peso.
    let dx = tx - this.position.x;
    let dy = ty - this.position.y;
    const m = Math.hypot(dx, dy);
    if (m > 0) {
      dx = (dx / m) * this.maxSpeed;
      dy = (dy / m) * this.maxSpeed;
    }
    this.aplicarSteer(dx, dy, peso);
  }

  wander(): void {
    this.wanderSteer(1);
  }

  /**
   * Fuerza radial hacia/desde un punto que decae con la distancia (acotada a
   * 5..100 para evitar la singularidad). fuerza > 0 atrae, < 0 repele.
   */
  attract(px: number, py: number, fuerza: number): void {
    let dx = px - this.position.x;
    let dy = py - this.position.y;
    const m = Math.hypot(dx, dy);
    const d = acotar(m, 5, 100);
    if (m > 0) {
      dx /= m;
      dy /= m;
    }
    this.acceleration.x += dx * (fuerza / d);
    this.acceleration.y += dy * (fuerza / d);
  }

  /**
   * Fuerza para orbitar un centro: componente tangencial (giro) + atracción
   * leve al centro (resorte que mantiene la órbita cerrada).
   */
  orbit(cx: number, cy: number, fuerza: number): void {
    const rx = this.position.x - cx;
    const ry = this.position.y - cy;
    // Tangente = radial rotado 90°.
    let tx = -ry;
    let ty = rx;
    const tm = Math.hypot(tx, ty);
    if (tm > 0) {
      tx = (tx / tm) * fuerza;
      ty = (ty / tm) * fuerza;
    }
    this.acceleration.x += tx + rx * -0.02;
    this.acceleration.y += ty + ry * -0.02;
  }

  checkLimits(type: Limite): void {
    const W = this.ctx.W;
    const H = this.ctx.H;
    const pos = this.position;
    switch (type) {
      case "OTHERSIDE":
        if (pos.x > W) pos.x = this.w / 2;
        if (pos.x < 0) pos.x = W - this.w / 2;
        if (pos.y > H) pos.y = this.h / 2;
        if (pos.y < 0) pos.y = H - this.h / 2;
        break;
      case "REVERSE_X":
        if (pos.x > W || pos.x < 0) this.velocity.x *= -1;
        if (pos.y > H) pos.y = this.h / 2;
        if (pos.y < 0) pos.y = H - this.h / 2;
        break;
      case "REVERSE_Y":
        if (pos.x > W) pos.x = this.w / 2;
        if (pos.x < 0) pos.x = W - this.w / 2;
        // (El original comparaba pos.y con width por un typo; aquí con height.)
        if (pos.y > H || pos.y < 0) this.velocity.y *= -1;
        break;
      case "REVERSE_XY":
        if (pos.x > W || pos.x < 0) this.velocity.x *= -1;
        if (pos.y > H || pos.y < 0) this.velocity.y *= -1;
        break;
    }
  }
}
