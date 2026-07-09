import { createRng } from "@/lib/milpa/random";
import type { Point } from "@/lib/milpa/spaceColonization";
import { rgba } from "./util";

/**
 * Fauna de la capa frontal: pájaros e insectos que entran volando, se posan
 * en una flor de la milpa cercana y se van. Cada criatura tiene una ventana
 * de progreso de scroll [p0, p1] que la despierta (con histéresis para no
 * parpadear en el borde). Solo salen con clima despejado y con luz.
 */

type EstadoCriatura = "oculta" | "entrando" | "posada" | "saliendo";

export interface Criatura {
  tipo: "pajaro" | "insecto";
  /** Índice de la flor ancla (las posiciones vivas las pasa la escena). */
  florIndex: number;
  ventana: [number, number];
  estado: EstadoCriatura;
  /** Avance 0..1 dentro del estado actual (entrando/saliendo). */
  t: number;
  /** Offset del punto de entrada respecto de la flor (fuera de pantalla). */
  entradaDx: number;
  entradaDy: number;
  /** Punto de despegue congelado al entrar (coords de pantalla). */
  desde: Point;
  fase: number;
  escala: number;
}

const HISTERESIS = 0.03;
// matrix.panel: silueta oscura del cuerpo (tailwind.config.ts).
const COLOR_CUERPO = "#0a140d";
// neon.amber: acento de pecho/brillo cuando está posada.
const COLOR_ACENTO = "#ffae42";
// matrix.text translúcido para alas de insecto.
const COLOR_ALA = rgba("#7fffa8", 0.22);

export function crearFauna(
  numFlores: number,
  seed: number | string,
  ancho: number,
  alto: number,
): Criatura[] {
  if (numFlores === 0) return [];
  const rng = createRng(seed);
  const tipos: Array<"pajaro" | "insecto"> = [
    "pajaro",
    "pajaro",
    "insecto",
    "insecto",
    "insecto",
  ];
  return tipos.map((tipo, i) => {
    // Ventanas escalonadas a lo largo del scroll, con solape parcial.
    const inicio = 0.05 + (i / tipos.length) * 0.6 + rng() * 0.08;
    const lado = rng() < 0.5 ? -1 : 1;
    return {
      tipo,
      florIndex: Math.floor(rng() * numFlores),
      ventana: [inicio, Math.min(0.98, inicio + 0.3 + rng() * 0.15)],
      estado: "oculta",
      t: 0,
      entradaDx: lado * (ancho * 0.35 + 120 + rng() * 120),
      entradaDy: -(alto * (0.2 + rng() * 0.25)),
      desde: { x: 0, y: 0 },
      fase: rng() * Math.PI * 2,
      escala: tipo === "pajaro" ? 0.9 + rng() * 0.4 : 0.7 + rng() * 0.5,
    };
  });
}

/** Subconjunto de la API p5 que usa el dibujo de fauna. */
interface Lienzo {
  push(): void;
  pop(): void;
  translate(x: number, y: number): void;
  rotate(a: number): void;
  scale(x: number, y?: number): void;
  fill(c: string): void;
  noStroke(): void;
  stroke(c: string): void;
  strokeWeight(w: number): void;
  noFill(): void;
  ellipse(x: number, y: number, w: number, h?: number): void;
  triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
}

function suavizarSalida(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function actualizarYDibujarFauna(
  p: Lienzo,
  criaturas: Criatura[],
  flores: Point[],
  progreso: number,
  activa: boolean,
  tiempo: number,
  dt: number,
  estatica: boolean,
): void {
  for (const c of criaturas) {
    const flor = flores[c.florIndex];
    if (!flor) continue;
    const dentro = progreso >= c.ventana[0] && progreso <= c.ventana[1];
    const fuera =
      progreso < c.ventana[0] - HISTERESIS || progreso > c.ventana[1] + HISTERESIS;

    if (estatica) {
      // Modo reduced-motion: un frame, criaturas ya posadas si toca.
      if (activa && dentro) dibujarCriatura(p, c, flor.x, flor.y, 0, true);
      continue;
    }

    switch (c.estado) {
      case "oculta": {
        if (activa && dentro) {
          c.estado = "entrando";
          c.t = 0;
          c.desde = { x: flor.x + c.entradaDx, y: flor.y + c.entradaDy };
        }
        break;
      }
      case "entrando": {
        c.t += dt / (c.tipo === "pajaro" ? 2.2 : 3);
        if (c.t >= 1) {
          c.t = 1;
          c.estado = "posada";
        }
        const e = suavizarSalida(Math.min(1, c.t));
        const x = c.desde.x + (flor.x - c.desde.x) * e;
        const arco = -Math.sin(e * Math.PI) * 46;
        const tambaleo =
          c.tipo === "insecto" ? Math.sin(tiempo * 14 + c.fase) * 5 * (1 - e) : 0;
        const y = c.desde.y + (flor.y - c.desde.y) * e + arco + tambaleo;
        dibujarCriatura(p, c, x, y, tiempo, false);
        break;
      }
      case "posada": {
        if (!activa || fuera) {
          c.estado = "saliendo";
          c.t = 0;
          break;
        }
        const bob = Math.sin(tiempo * 3 + c.fase) * 1.4;
        dibujarCriatura(p, c, flor.x, flor.y + bob, tiempo, true);
        break;
      }
      case "saliendo": {
        c.t += dt / 1.6;
        if (c.t >= 1) {
          c.estado = "oculta";
          c.t = 0;
          break;
        }
        const e = c.t * c.t;
        const x = flor.x + (c.desde.x - flor.x) * e;
        const y = flor.y + (c.desde.y - flor.y) * e - Math.sin(e * Math.PI) * 30;
        dibujarCriatura(p, c, x, y, tiempo, false);
        break;
      }
    }
  }
}

function dibujarCriatura(
  p: Lienzo,
  c: Criatura,
  x: number,
  y: number,
  tiempo: number,
  posada: boolean,
): void {
  p.push();
  p.translate(x, y);
  // Mira hacia el lado por el que entró (viene volando desde entradaDx).
  if (c.entradaDx > 0) p.scale(-1, 1);
  p.scale(c.escala, c.escala);
  p.noStroke();

  if (c.tipo === "pajaro") {
    const aleteo = posada
      ? Math.sin(tiempo * 2 + c.fase) * 0.06
      : Math.sin(tiempo * 13 + c.fase) * 0.7;
    // Cuerpo, cabeza, cola y pico en silueta.
    p.fill(COLOR_CUERPO);
    p.ellipse(0, 0, 15, 9);
    p.ellipse(6, -4, 7, 6);
    p.triangle(-6, -1, -13, -5, -12, 2); // cola
    p.triangle(9, -4, 13, -3, 9, -2); // pico
    if (posada) {
      p.fill(rgba(COLOR_ACENTO, 0.55));
      p.ellipse(2, 1.5, 6, 4); // pecho iluminado
    }
    // Ala batiendo.
    p.push();
    p.translate(0, -2);
    p.rotate(-0.4 + aleteo);
    p.fill(COLOR_CUERPO);
    p.triangle(0, 0, -11, -7, 2, -8);
    p.pop();
  } else {
    const zumbido = posada ? 0.35 : 1;
    const batir = Math.abs(Math.sin(tiempo * 26 + c.fase)) * zumbido;
    // Alas translúcidas.
    p.fill(COLOR_ALA);
    p.ellipse(-1, -3 - batir * 2, 7, 3 + batir * 3);
    p.ellipse(1, -3 - batir * 2, 7, 3 + batir * 3);
    // Cuerpo con brillo ámbar.
    p.fill(COLOR_CUERPO);
    p.ellipse(0, 0, 6, 4);
    p.fill(rgba(COLOR_ACENTO, 0.7));
    p.ellipse(-1.5, 0, 2.5, 2);
  }

  p.pop();
}
