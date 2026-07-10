import type p5 from "p5";

/**
 * Partícula estilo "Nature of Code" portada de
 * `p5_works/bibliotecas/particulas.js` a modo instancia.
 *
 * Conversión global → instancia: recibe `p` en el constructor y prefija toda
 * la API de p5 con `this.p.` (`createVector` → `this.p.createVector`,
 * `width` → `this.p.width`, etc.). El resto de la lógica se conserva igual.
 */
export class Particle {
  p: p5;
  pos: p5.Vector;
  size: number;
  vel: p5.Vector;
  acc: p5.Vector;
  maxspeed: number;
  prevPos: p5.Vector;

  r: number;
  g: number;
  b: number;
  rS: number;
  gS: number;
  bS: number;
  aS: number;

  angle: number;
  alpha: number;
  alphaIncrement: number;
  stroke: number;
  particleStrokeColor: string;
  type: string;
  direction: p5.Vector;
  counter: number;

  constructor(
    p: p5,
    posicion: p5.Vector,
    size = 5,
    stroke = 1,
    type = "circle",
    particleColor = "#000000",
    particleStrokeColor = "#000000",
    particleAngle = 0,
  ) {
    this.p = p;
    this.pos = p.createVector(posicion.x, posicion.y);
    this.size = size;
    this.vel = p.createVector(0, 0);
    this.acc = p.createVector(0, 0);
    this.maxspeed = 4;
    this.prevPos = this.pos.copy();

    this.r = p.red(particleColor);
    this.g = p.green(particleColor);
    this.b = p.blue(particleColor);

    this.rS = p.red(particleStrokeColor);
    this.gS = p.green(particleStrokeColor);
    this.bS = p.blue(particleStrokeColor);
    this.aS = p.alpha(particleStrokeColor);

    this.angle = particleAngle;

    this.alpha = 255;
    this.alphaIncrement = -0.005;
    this.stroke = stroke;
    this.particleStrokeColor = particleStrokeColor;
    this.type = type;
    this.direction = p.createVector(p.random(1), p.random(1));
    this.counter = 0;
  }

  setAngle(angle: number) {
    this.angle = angle;
  }

  setDirection(vector: p5.Vector) {
    this.direction = this.p.createVector(vector.x, vector.y);
  }

  getAngle() {
    return this.angle;
  }

  getDirection() {
    return this.direction;
  }

  getPosition() {
    return this.pos;
  }

  setPosition(position: p5.Vector) {
    this.pos = position.copy();
  }

  finished() {
    return this.alpha < 0;
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxspeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  follow(force: p5.Vector) {
    this.applyForce(force);
  }

  applyForce(force: p5.Vector) {
    this.acc.add(force);
  }

  show(type: string) {
    const p = this.p;
    // Estela coloreada (pieza `generativoParticulas`): traza una línea entre la
    // posición actual y la previa usando el color/alfa que derivan en el tiempo,
    // en coordenadas absolutas (sin translate/rotate). Retorna temprano para no
    // pasar por el dibujo de figuras.
    if (type === "estela") {
      p.stroke(this.r, this.g, this.b, this.alpha);
      p.strokeWeight(this.stroke);
      p.line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);
      this.updatePrev();
      return;
    }
    p.push();
    p.translate(this.pos.x, this.pos.y);
    p.rotate(this.angle);
    p.stroke(this.rS, this.gS, this.bS, this.aS);
    p.strokeWeight(this.stroke);
    p.fill(this.r, this.g, this.b, this.alpha);
    switch (type) {
      case "circle":
        p.circle(0, 0, this.size);
        break;
      case "square":
        p.rect(0, 0, this.size * 1, this.size);
        break;
      case "petalo": {
        // Pétalo alargado apuntando hacia afuera a lo largo del eje local +y:
        // `Spiral` ya rota la partícula a su ángulo polar antes de llamar a
        // `show()`, así que basta con dibujar la forma "hacia arriba" desde el
        // origen para que quede orientada radialmente. Base angosta en (0,0)
        // (punto de inserción), dos curvas bezier simétricas que abren al
        // ancho máximo hacia la mitad del largo y cierran redondeado en la
        // punta (0, largo) — perfil clásico de pétalo tipo gota.
        const largo = this.size * 1.6;
        const ancho = this.size * 0.55;
        p.beginShape();
        p.vertex(0, 0);
        p.bezierVertex(ancho, largo * 0.15, ancho * 0.85, largo * 0.85, 0, largo);
        p.bezierVertex(-ancho * 0.85, largo * 0.85, -ancho, largo * 0.15, 0, 0);
        p.endShape(p.CLOSE);
        break;
      }
      case "line":
        p.line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);
        this.updatePrev();
        break;
      default:
        p.circle(this.pos.x, this.pos.y, this.size);
        break;
    }
    p.pop();
  }

  updateRgb() {
    if (this.r > 10) {
      this.r -= this.p.random(0.1, 0.2);
    }
    if (this.r == 0) {
      this.r += this.p.random(0.1, 0.2);
    }

    if (this.g > 10) {
      this.g -= this.p.random(0.1, 0.2);
    }
    if (this.g == 0) {
      this.g += this.p.random(0.1, 0.2);
    }

    if (this.b == 0) {
      this.b += this.p.random(0.1, 0.3);
    }
    if (this.b == 255) {
      this.b -= this.p.random(0.1, 0.3);
    }
    this.alpha += this.alphaIncrement;
  }

  updatePrev() {
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;
  }

  edges() {
    const p = this.p;
    if (this.pos.x > p.width) {
      this.pos.x = 0;
      this.prevPos.x = 0 - this.size / 2;
    }
    if (this.pos.x < 0) {
      this.pos.x = p.width;
      this.prevPos.x = p.width + this.size / 2;
    }
    if (this.pos.y > p.height) {
      this.pos.y = 0;
      this.prevPos.y = 0 - this.size / 2;
    }
    if (this.pos.y < 0) {
      this.pos.y = p.height;
      this.prevPos.y = p.height + this.size / 2;
    }
  }

  /**
   * Deriva de color/alfa por frame para la estela de `generativoParticulas`:
   * el trazo se desvanece (alpha baja) y el tono se desplaza lentamente.
   *
   * Tasa reducida a una décima parte del valor original (0.1/-0.1 → 0.01/-0.01):
   * sin tope, el desplazamiento original saturaba r/g en 255 y llevaba b a 0 en
   * menos de un minuto, convergiendo TODAS las partículas al mismo amarillo sin
   * importar su color inicial — diluía por completo cualquier paleta asignada
   * (ver `generativoParticulas.ts`). Se conserva el efecto de deriva orgánica,
   * solo más lento, para que la identidad de color de cada partícula dure.
   */
  derivaColor() {
    this.alpha -= 0.08;
    this.r += 0.01;
    this.g += 0.01;
    this.b -= 0.01;
  }

  /**
   * Rebote en los bordes (invierte la velocidad), alternativa a `edges()` (que
   * hace wrap toroidal). Usado por `generativoParticulas`.
   */
  rebote() {
    const p = this.p;
    if (this.pos.x > p.width || this.pos.x < 0) {
      this.vel.x *= -1;
    }
    if (this.pos.y > p.height || this.pos.y < 0) {
      this.vel.y *= -1;
    }
  }
}
