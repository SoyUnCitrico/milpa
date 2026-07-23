import type p5 from "p5";
import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Camara } from "./camara";

/**
 * Rastreo de **cara** con MediaPipe Face Landmarker: 478 landmarks 3D, la
 * triangulación que los cose en una malla, y los blendshapes de parpadeo
 * **por ojo separado**.
 *
 * Es hermana de `manosMediaPipe.ts` pero deliberadamente **aparte**: aquella
 * expone gestos de mano y un `onParpadeo` de "ambos ojos" del que dependen
 * `florShader` y `florManos`. Las piezas que necesitan la geometría de la cara
 * (no un gesto) usan esta, sin tocar la otra.
 *
 * Lo que sí se calca de `manosMediaPipe.ts`, porque ya está resuelto ahí:
 * - `@mediapipe/tasks-vision` se importa **dinámicamente** dentro de
 *   `iniciar()`: toca `window`/WASM y rompería el SSR de Next.
 * - WASM y modelo `.task` por CDN (nada pesado en el repo).
 * - `iniciar(deviceId)` reentrante: cambiar de cámara **no** recarga el modelo.
 * - La cámara la maneja `Camara` de `camara.ts` (con `SelectorCamara` del lado
 *   de la pieza), no `p.createCapture`.
 * - `detectForVideo` corre **una vez por frame de video**, guardado por
 *   `video.currentTime`.
 * - `fase`/`mensaje` para que el HUD distinga cargando / sin permiso / error /
 *   sin detección.
 * - `dibujarPreview` compone en un `p5.Graphics` **2D** y lo estampa con
 *   `p.image()`: en WEBGL `drawingContext` no es un contexto 2D, y el `<video>`
 *   propio necesita `drawImage`.
 *
 * **Coordenadas**: los landmarks salen normalizados 0–1 y **espejados en X**
 * (`x → 1 − x`), para que la pieza se lea como espejo. Espejar invierte el
 * *winding* de los triángulos de la malla: quien la dibuje con backface culling
 * activo tiene que invertir el orden de los índices (p5 no culea caras por
 * defecto, así que en la práctica no molesta). La `z` viene en la misma escala
 * que la `x` y es **más negativa cuanto más cerca** de la cámara.
 *
 * **Triangulación**: `FaceLandmarker.FACE_LANDMARKS_TESSELATION` **no** son
 * triángulos, son 2556 *pares* de conexiones (aristas). Los triángulos se
 * derivan **una sola vez al arrancar** recuperando los 3-ciclos del grafo
 * (adyacencia + `a < b < c` para deduplicar): 468 vértices, 2556 aristas → 854
 * triángulos. Se hace así, y no con un blob de ~2700 números mágicos pegados a
 * mano, para que la malla siga al modelo si el paquete cambia.
 */

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODELO_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** Punta de la nariz en la malla canónica de MediaPipe. */
export const NARIZ = 1;

/**
 * Rango razonable de triángulos para 468–478 vértices. Fuera de él la malla
 * está rota (o el modelo cambió) y conviene saberlo en vez de dibujar basura.
 */
const TRIANGULOS_MIN = 700;
const TRIANGULOS_MAX = 1100;

/** Arista del grafo de teselación (el `Connection` del paquete, que no exporta). */
interface Arista {
  start: number;
  end: number;
}

export interface PuntoCara {
  x: number;
  y: number;
  z: number;
}

/** Caja envolvente de los landmarks, en coordenadas normalizadas de imagen. */
export interface CajaCara {
  minX: number;
  minY: number;
  ancho: number;
  alto: number;
  centroX: number;
  centroY: number;
}

export interface Cara {
  /** Landmarks normalizados (0–1), espejados en X. */
  puntos: PuntoCara[];
  /** Caja envolvente de todos los landmarks (espacio local de la cara). */
  caja: CajaCara;
  /** Punta de la nariz, ya espejada. */
  nariz: PuntoCara;
  /**
   * Blendshape `eyeBlinkLeft`: ojo **izquierdo del sujeto**. Como el preview
   * está espejado, en la imagen aparece a la derecha.
   */
  cierreIzq: number;
  /** Blendshape `eyeBlinkRight`: ojo **derecho del sujeto**. */
  cierreDer: number;
}

export type EstadoRastreo =
  | "apagado"
  | "cargando"
  | "activo"
  | "sin-permiso"
  | "error";

/**
 * UV de un punto **en espacio local de la cara**: su posición dentro de la caja
 * envolvente de todos los landmarks. Calcular las UV así (y no en espacio de
 * pantalla) es lo que ancla la textura a la cara: si el usuario se mueve o se
 * acerca, la caja se mueve con él y la textura no se desliza.
 *
 * `v` se invierte (`1 −`) porque la `y` de la imagen crece hacia abajo y la de
 * una textura hacia arriba.
 */
export function uvLocal(punto: PuntoCara, caja: CajaCara): [number, number] {
  return [
    (punto.x - caja.minX) / Math.max(caja.ancho, 1e-6),
    1 - (punto.y - caja.minY) / Math.max(caja.alto, 1e-6),
  ];
}

/**
 * Triángulos a partir del grafo de aristas de la teselación: todos los
 * 3-ciclos `a < b < c` con las tres aristas presentes. El orden creciente hace
 * de dedupe (cada triángulo aparece una sola vez) sin necesidad de un `Set` de
 * claves de texto.
 */
export function derivarTriangulos(aristas: Arista[]): Uint16Array {
  const adyacencia = new Map<number, Set<number>>();
  const vecinos = (i: number): Set<number> => {
    let s = adyacencia.get(i);
    if (!s) {
      s = new Set<number>();
      adyacencia.set(i, s);
    }
    return s;
  };
  for (const { start, end } of aristas) {
    vecinos(start).add(end);
    vecinos(end).add(start);
  }

  const salida: number[] = [];
  for (const [a, vecA] of adyacencia) {
    for (const b of vecA) {
      if (b <= a) continue;
      for (const c of adyacencia.get(b)!) {
        if (c <= b) continue;
        if (!vecA.has(c)) continue;
        salida.push(a, b, c);
      }
    }
  }
  return Uint16Array.from(salida);
}

export class RastreadorCara {
  /** Última lectura. `null` mientras no haya cara en cuadro. */
  estado: { cara: Cara | null } = { cara: null };
  /** Estado del rastreador, para el HUD de la pieza. */
  fase: EstadoRastreo = "apagado";
  /** Mensaje legible del último error (si `fase === "error"`). */
  mensaje = "";
  /**
   * Índices de la malla, de tres en tres. Vacío hasta que `iniciar()` cargue el
   * paquete y derive los triángulos.
   */
  triangulos: Uint16Array = new Uint16Array(0);
  /** Aviso si la triangulación derivada quedó fuera del rango esperado. */
  avisoMalla = "";

  private p: p5;
  private camara: Camara;
  private landmarker?: FaceLandmarker;
  private contornos: Arista[] = [];
  private ultimoTiempo = -1;
  private buffer?: p5.Graphics;

  constructor(p: p5) {
    this.p = p;
    this.camara = new Camara(p);
  }

  /**
   * Carga el modelo (una sola vez) y abre la cámara indicada. Reentrante:
   * llamarla con otro `deviceId` cambia de cámara sin recargar el modelo. Debe
   * dispararse desde un gesto del usuario (el navegador exige interacción para
   * `getUserMedia`).
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
        this.landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODELO_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          // Da eyeBlinkLeft / eyeBlinkRight, que es la interacción por ojos.
          outputFaceBlendshapes: true,
          // `outputFacialTransformationMatrixes` queda apagado a propósito: la
          // pose de la cabeza ya viaja en la `z` de los propios landmarks (la
          // malla se deforma sola al girar), y pedir la matriz obligaría a
          // descomponerla para nada.
        });
        this.prepararMalla(vision.FaceLandmarker);
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

  /** Apaga el rastreo y libera cámara y modelo. */
  detener(): void {
    this.camara.cerrar();
    this.landmarker?.close();
    this.landmarker = undefined;
    this.estado = { cara: null };
    this.fase = "apagado";
  }

  get activo(): boolean {
    return this.fase === "activo";
  }

  /** Hay cara en cuadro en la última lectura. */
  get hayCara(): boolean {
    return this.estado.cara !== null;
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
      const res = this.landmarker.detectForVideo(video, performance.now());
      const crudos = res.faceLandmarks?.[0];
      if (!crudos || crudos.length === 0) {
        this.estado = { cara: null };
        return;
      }
      const categorias = res.faceBlendshapes?.[0]?.categories ?? [];
      let izq = 0;
      let der = 0;
      for (const c of categorias) {
        if (c.categoryName === "eyeBlinkLeft") izq = c.score;
        else if (c.categoryName === "eyeBlinkRight") der = c.score;
      }
      this.estado = { cara: this.derivarCara(crudos, izq, der) };
    } catch (err) {
      // Una inferencia fallida no debe tumbar el `draw()` de la pieza: se
      // reporta en el HUD y el sketch sigue con sus controles manuales.
      this.fase = "error";
      this.mensaje = (err as Error)?.message ?? String(err);
    }
  }

  /**
   * Deriva la malla y guarda los contornos del preview. Se hace una sola vez,
   * al cargar el paquete: es ~2500 aristas recorridas, nada frente a una
   * inferencia, pero tampoco hay razón para repetirlo por frame.
   */
  private prepararMalla(FL: typeof FaceLandmarker): void {
    this.contornos = FL.FACE_LANDMARKS_CONTOURS as unknown as Arista[];
    const teselacion = FL.FACE_LANDMARKS_TESSELATION as unknown as Arista[];
    this.triangulos = derivarTriangulos(teselacion);
    const n = this.triangulos.length / 3;
    this.avisoMalla =
      n < TRIANGULOS_MIN || n > TRIANGULOS_MAX
        ? `malla sospechosa: ${n} triángulos desde ${teselacion.length} aristas`
        : "";
  }

  /** Landmarks crudos → cara espejada, con caja envolvente y nariz. */
  private derivarCara(
    crudos: NormalizedLandmark[],
    cierreIzq: number,
    cierreDer: number,
  ): Cara {
    // Espejo en X: la cámara ve al usuario de frente, la pieza responde como
    // espejo. La `z` no se toca (sigue siendo negativa hacia la cámara).
    const puntos: PuntoCara[] = crudos.map((l) => ({
      x: 1 - l.x,
      y: l.y,
      z: l.z,
    }));

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const q of puntos) {
      if (q.x < minX) minX = q.x;
      if (q.x > maxX) maxX = q.x;
      if (q.y < minY) minY = q.y;
      if (q.y > maxY) maxY = q.y;
    }
    const caja: CajaCara = {
      minX,
      minY,
      ancho: Math.max(maxX - minX, 1e-6),
      alto: Math.max(maxY - minY, 1e-6),
      centroX: (minX + maxX) / 2,
      centroY: (minY + maxY) / 2,
    };

    return {
      puntos,
      caja,
      nariz: puntos[NARIZ] ?? puntos[0],
      cierreIzq,
      cierreDer,
    };
  }

  /**
   * Preview espejado de la cámara con la cara dibujada encima, en un recuadro
   * de ancho `w` y esquina en (x, y). Sin él es imposible distinguir "no
   * detecta" de "la cámara no abrió".
   *
   * Se dibujan los **contornos** (óvalo, cejas, ojos, labios, iris) y no la
   * teselación completa: 2556 líneas por frame en un recuadro de 200 px es
   * gasto puro y se lee como una mancha. Los 478 landmarks van como puntos, que
   * es lo que da la sensación de malla.
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
      // Espejo horizontal: el preview se lee como espejo, igual que los
      // landmarks (que ya vienen espejados de `derivarCara`).
      const ctx = g.drawingContext as CanvasRenderingContext2D;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.translate(ancho, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, ancho, alto);
      ctx.restore();
    }

    const cara = this.estado.cara;
    if (cara) {
      g.stroke(colores.linea);
      g.strokeWeight(1);
      for (const { start, end } of this.contornos) {
        const a = cara.puntos[start];
        const b = cara.puntos[end];
        if (!a || !b) continue;
        g.line(a.x * ancho, a.y * alto, b.x * ancho, b.y * alto);
      }
      g.noStroke();
      g.fill(colores.punto);
      for (const q of cara.puntos) g.circle(q.x * ancho, q.y * alto, 1.6);
      // La nariz marcada: es el punto donde se clava la parte brillante de la
      // textura, así que conviene verlo.
      g.fill(colores.linea);
      g.circle(cara.nariz.x * ancho, cara.nariz.y * alto, 5);
    }

    g.noFill();
    g.stroke(colores.marco);
    g.strokeWeight(2);
    g.rect(0, 0, ancho, alto);

    p.push();
    // `tint(255)` y no `noTint()`: en WEBGL, `noTint()` deja `_tint` en `null` y
    // el `_setFillUniforms` de p5 1.9.4 llama `setUniform("uTint", null)`, que
    // revienta con "Cannot read properties of null (reading 'slice')".
    p.tint(255);
    p.image(g, x, y, w, h);
    p.pop();
  }
}
