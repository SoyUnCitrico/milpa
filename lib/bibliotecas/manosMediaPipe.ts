import type p5 from "p5";
import type {
  HandLandmarker,
  FaceLandmarker,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { Camara } from "./camara";

/**
 * Rastreo de manos con **MediaPipe Hand Landmarker** (modelo de IA de visión
 * de Google: 21 puntos 3D por mano) traducido a parámetros listos para
 * modular un sketch generativo.
 *
 * El modelo devuelve landmarks crudos; lo que las piezas necesitan son
 * **gestos normalizados** (pinza, dedos levantados, puño, separación entre
 * manos). Toda esa derivación vive aquí para que cualquier sketch la reuse sin
 * volver a razonar sobre índices de landmarks.
 *
 * Notas de integración con la galería:
 * - El WASM y el modelo `.task` se cargan por CDN (jsDelivr + Google Storage),
 *   igual que los pósters viven en S3: nada pesado dentro del repo. Requiere
 *   red la primera vez (el navegador luego los cachea).
 * - `@mediapipe/tasks-vision` se importa **dinámicamente** dentro de
 *   `iniciar()`: toca `window`/WASM y rompería el SSR de Next si se importara
 *   a nivel de módulo (mismo criterio que Tone.js en `P5Sketch.tsx`).
 * - La cámara la maneja `lib/bibliotecas/camara.ts` (`Camara`): permite elegir
 *   dispositivo con `SelectorCamara` y evita los problemas de
 *   `p.createCapture` + `.hide()` (video oculto que deja de decodificar
 *   frames). `iniciar(deviceId)` es reentrante: cambiar de cámara no recarga
 *   el modelo.
 *
 * Sistema de coordenadas: todas las posiciones salen **normalizadas 0–1** y
 * **espejadas en X** (el usuario mueve la mano derecha y la flor responde del
 * lado derecho, como en un espejo).
 *
 * Detección de parpadeo (opcional): si se pasa `onParpadeo` al constructor, se
 * carga además el **MediaPipe Face Landmarker** con blendshapes sobre el mismo
 * video, y se llama al callback cuando el usuario cierra ambos ojos (flanco de
 * entrada, con un refractario para no dispararlo en ráfaga). Es lo que permite,
 * p. ej., guardar la imagen "al cerrar los ojos".
 */

export interface OpcionesRastreador {
  /**
   * Si se define, se activa la detección de parpadeo (carga el Face Landmarker)
   * y se llama en el flanco en que el usuario cierra ambos ojos.
   */
  onParpadeo?: () => void;
}

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODELO_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const MODELO_CARA_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** Umbral de los blendshapes de parpadeo (0–1) para considerar el ojo cerrado. */
const UMBRAL_PARPADEO = 0.5;
/** Refractario entre disparos de parpadeo, en ms (evita ráfagas por frame). */
const REFRACTARIO_PARPADEO = 1200;

/** Índices de landmarks del modelo (los que usan los gestos). */
const MUNECA = 0;
const PULGAR_PUNTA = 4;
const PULGAR_IP = 3;
const NUDILLO_MEDIO = 9; // base del dedo medio: referencia de escala de la mano
const PUNTAS = [8, 12, 16, 20]; // índice, medio, anular, meñique
const FALANGES = [6, 10, 14, 18]; // articulación media de cada uno de esos dedos

/** Esqueleto de la mano (pares de landmarks conectados) para el preview. */
const CONEXIONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export interface Punto {
  x: number;
  y: number;
}

/** Una mano detectada, ya traducida a gestos normalizados. */
export interface Mano {
  /** 21 landmarks normalizados (0–1), espejados en X. */
  puntos: Punto[];
  /** Centro de la palma (muñeca + nudillo medio). */
  centro: Punto;
  /** Cuántos dedos están levantados, 0–5 (incluye el pulgar). */
  dedos: number;
  /**
   * Separación pulgar–índice, 0–1, relativa al tamaño de la mano (invariante a
   * la distancia a la cámara). ~0 pinza cerrada, ~1 completamente abierta.
   */
  pinza: number;
  /** Apertura general de la mano: 0 = puño cerrado, 1 = mano extendida. */
  apertura: number;
  /** Puño cerrado (ningún dedo levantado). */
  puno: boolean;
  /** Etiqueta del modelo: "Left" | "Right" (según la imagen sin espejar). */
  lado: string;
}

export interface EstadoManos {
  manos: Mano[];
  /**
   * Distancia entre los centros de ambas manos (0–1). `null` si no hay dos
   * manos en cuadro.
   */
  separacion: number | null;
}

export type EstadoRastreo =
  | "apagado"
  | "cargando"
  | "activo"
  | "sin-permiso"
  | "error";

/** Distancia euclidiana entre dos puntos normalizados. */
function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class RastreadorManos {
  /** Última lectura. Vacía mientras no haya manos en cuadro. */
  estado: EstadoManos = { manos: [], separacion: null };
  /** Estado del rastreador, para mostrarlo en el HUD del sketch. */
  fase: EstadoRastreo = "apagado";
  /** Mensaje legible del último error (si `fase === "error"`). */
  mensaje = "";

  /** Ambos ojos cerrados en la última lectura (solo si hay detección de cara). */
  ojosCerrados = false;

  private p: p5;
  private camara: Camara;
  private landmarker?: HandLandmarker;
  private caraLandmarker?: FaceLandmarker;
  private ultimoTiempo = -1;
  private ojosCerradosPrev = false;
  private ultimoParpadeo = 0;
  private onParpadeo?: () => void;
  /** Buffer 2D donde se compone el preview (ver `dibujarPreview`). */
  private buffer?: p5.Graphics;

  constructor(p: p5, opciones: OpcionesRastreador = {}) {
    this.p = p;
    this.camara = new Camara(p);
    this.onParpadeo = opciones.onParpadeo;
  }

  /**
   * Carga el modelo (una sola vez) y abre la cámara indicada. Reentrante:
   * llamarla con otro `deviceId` cambia de cámara sin recargar el modelo.
   * Debe dispararse desde un gesto del usuario (el navegador exige
   * interacción para `getUserMedia`).
   */
  async iniciar(deviceId?: string): Promise<void> {
    if (this.fase === "cargando") return;
    this.fase = "cargando";
    this.mensaje = "";
    try {
      if (!this.landmarker) {
        // Import dinámico: el bundle toca window/WASM y rompe en SSR.
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
        this.landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODELO_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
        // Face Landmarker solo si la pieza pidió detección de parpadeo: es un
        // segundo modelo y no todas las piezas lo necesitan.
        if (this.onParpadeo && !this.caraLandmarker) {
          this.caraLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODELO_CARA_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: true, // da eyeBlinkLeft / eyeBlinkRight
          });
        }
      }
      await this.camara.abrir(deviceId);
      this.ultimoTiempo = -1;
      this.fase = "activo";
    } catch (err) {
      const nombre = (err as { name?: string })?.name ?? "";
      this.fase =
        nombre === "NotAllowedError" || nombre === "SecurityError"
          ? "sin-permiso"
          : "error";
      this.mensaje = (err as Error)?.message ?? String(err);
      this.camara.cerrar();
    }
  }

  /** Apaga el rastreo y libera cámara y modelos. */
  detener(): void {
    this.camara.cerrar();
    this.landmarker?.close();
    this.landmarker = undefined;
    this.caraLandmarker?.close();
    this.caraLandmarker = undefined;
    this.estado = { manos: [], separacion: null };
    this.ojosCerrados = false;
    this.ojosCerradosPrev = false;
    this.fase = "apagado";
  }

  get activo(): boolean {
    return this.fase === "activo";
  }

  /**
   * Corre la inferencia sobre el frame actual. Llamar una vez por `draw()`:
   * solo procesa si el video avanzó, así no se paga el costo dos veces por
   * frame de cámara.
   */
  actualizar(): void {
    const video = this.camara.video;
    if (!this.landmarker || !video || !this.camara.listo) return;
    if (video.currentTime === this.ultimoTiempo) return;
    this.ultimoTiempo = video.currentTime;

    try {
      const resultado = this.landmarker.detectForVideo(video, performance.now());
      const manos: Mano[] = resultado.landmarks.map((puntos, i) =>
        this.derivarMano(puntos, resultado.handedness[i]?.[0]?.categoryName ?? ""),
      );
      this.estado = {
        manos,
        separacion:
          manos.length === 2 ? distancia(manos[0].centro, manos[1].centro) : null,
      };

      if (this.caraLandmarker) this.detectarParpadeo(video);
    } catch (err) {
      // Una inferencia fallida no debe tumbar el `draw()` de la pieza: se
      // reporta en el HUD y el sketch sigue con sus controles manuales.
      this.fase = "error";
      this.mensaje = (err as Error)?.message ?? String(err);
    }
  }

  /**
   * Lee los blendshapes de parpadeo del Face Landmarker. `ojosCerrados` es
   * true cuando ambos ojos superan el umbral; el callback `onParpadeo` se
   * dispara en el **flanco** de cierre (no mientras siguen cerrados) y con un
   * refractario, para que un parpadeo guarde una sola imagen.
   */
  private detectarParpadeo(video: HTMLVideoElement): void {
    const cara = this.caraLandmarker!.detectForVideo(video, performance.now());
    const categorias = cara.faceBlendshapes?.[0]?.categories ?? [];
    let izq = 0;
    let der = 0;
    for (const c of categorias) {
      if (c.categoryName === "eyeBlinkLeft") izq = c.score;
      else if (c.categoryName === "eyeBlinkRight") der = c.score;
    }
    this.ojosCerrados =
      categorias.length > 0 && izq > UMBRAL_PARPADEO && der > UMBRAL_PARPADEO;

    const ahora = performance.now();
    if (
      this.ojosCerrados &&
      !this.ojosCerradosPrev &&
      ahora - this.ultimoParpadeo > REFRACTARIO_PARPADEO
    ) {
      this.ultimoParpadeo = ahora;
      this.onParpadeo?.();
    }
    this.ojosCerradosPrev = this.ojosCerrados;
  }

  /** Traduce los 21 landmarks crudos de una mano a gestos normalizados. */
  private derivarMano(crudos: NormalizedLandmark[], lado: string): Mano {
    // Espejo en X: la cámara ve al usuario de frente, la pieza responde como
    // espejo (mano derecha del usuario = lado derecho del canvas).
    const puntos: Punto[] = crudos.map((l) => ({ x: 1 - l.x, y: l.y }));

    const muneca = puntos[MUNECA];
    const nudillo = puntos[NUDILLO_MEDIO];
    // Escala de la mano: muñeca → base del dedo medio. Normalizar por ella
    // hace los gestos invariantes a qué tan cerca esté la mano de la cámara.
    const escala = Math.max(distancia(muneca, nudillo), 1e-4);

    // Un dedo está levantado si su punta queda más lejos de la muñeca que su
    // falange media (criterio robusto a la rotación de la mano; comparar solo
    // `y` falla en cuanto el usuario gira la muñeca).
    let dedos = 0;
    let extension = 0;
    for (let i = 0; i < PUNTAS.length; i++) {
      const dPunta = distancia(puntos[PUNTAS[i]], muneca) / escala;
      const dFalange = distancia(puntos[FALANGES[i]], muneca) / escala;
      if (dPunta > dFalange * 1.08) dedos++;
      extension += Math.min(dPunta / 2.2, 1);
    }
    // El pulgar se evalúa aparte: se abre lateralmente, no se dobla como los
    // otros cuatro.
    const dPulgar = distancia(puntos[PULGAR_PUNTA], muneca) / escala;
    const dPulgarIP = distancia(puntos[PULGAR_IP], muneca) / escala;
    if (dPulgar > dPulgarIP * 1.08) dedos++;

    const pinza = Math.min(
      distancia(puntos[PULGAR_PUNTA], puntos[PUNTAS[0]]) / escala / 1.8,
      1,
    );

    return {
      puntos,
      centro: { x: (muneca.x + nudillo.x) / 2, y: (muneca.y + nudillo.y) / 2 },
      dedos,
      pinza,
      apertura: Math.min(extension / PUNTAS.length, 1),
      puno: dedos === 0,
      lado,
    };
  }

  /**
   * Preview espejado de la cámara con el esqueleto de las manos encima, en un
   * recuadro de ancho `w` y esquina en (x, y). Es el feedback de qué está
   * leyendo el modelo: sin él, cuando la detección falla el usuario no tiene
   * forma de saber por qué.
   *
   * Se compone en un `p5.Graphics` 2D y se estampa con `p.image()`, en vez de
   * dibujar directo sobre el canvas: el frame de video necesita `drawImage`
   * (el `<video>` es propio, no un `p5.MediaElement` de `createCapture`, así
   * que `p.image()` no lo acepta) y `drawingContext` **no** es un contexto 2D
   * cuando la pieza corre en WEBGL. Con el buffer intermedio el preview
   * funciona igual en los dos modos. El buffer se crea una sola vez y se
   * reusa mientras no cambie el tamaño.
   */
  dibujarPreview(
    x: number,
    y: number,
    w: number,
    colores: { linea: string; punto: string; marco: string },
  ): void {
    const p = this.p;
    const video = this.camara.video;
    const proporcion =
      video && video.videoWidth > 0 ? video.videoHeight / video.videoWidth : 0.75;
    const h = w * proporcion;

    const ancho = Math.round(w);
    const alto = Math.round(h);
    if (!this.buffer || this.buffer.width !== ancho || this.buffer.height !== alto) {
      this.buffer?.remove();
      this.buffer = p.createGraphics(ancho, alto);
    }
    const g = this.buffer;
    g.clear();

    if (video && this.camara.listo) {
      // Espejo horizontal para que el preview se lea como espejo, igual que
      // los landmarks (que ya vienen espejados de `derivarMano`).
      const ctx = g.drawingContext as CanvasRenderingContext2D;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.translate(ancho, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, ancho, alto);
      ctx.restore();
    }

    for (const mano of this.estado.manos) {
      g.stroke(colores.linea);
      g.strokeWeight(1.5);
      for (const [a, b] of CONEXIONES) {
        const pa = mano.puntos[a];
        const pb = mano.puntos[b];
        g.line(pa.x * ancho, pa.y * alto, pb.x * ancho, pb.y * alto);
      }
      g.noStroke();
      g.fill(colores.punto);
      for (const punto of mano.puntos) {
        g.circle(punto.x * ancho, punto.y * alto, 3);
      }
    }

    g.noFill();
    g.stroke(colores.marco);
    g.strokeWeight(2);
    g.rect(0, 0, ancho, alto);

    p.push();
    // `tint(255)` y no `noTint()`: en WEBGL, `noTint()` deja `_tint` en `null`
    // y el `_setFillUniforms` de p5 1.9.4 llama `setUniform("uTint", null)`,
    // que revienta con "Cannot read properties of null (reading 'slice')".
    // Un tinte blanco es neutro y sí es un valor válido para el uniform.
    p.tint(255);
    p.image(g, x, y, w, h);
    p.pop();
  }
}
