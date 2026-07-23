import type p5 from "p5";

/**
 * Cámara para los sketches: enumeración de dispositivos, menú de selección y
 * apertura del stream.
 *
 * Existe porque `p.createCapture(VIDEO)` no alcanza en la práctica:
 * - No deja elegir **cuál** cámara (portátiles con webcam integrada + externa,
 *   celulares con frontal/trasera) y suele abrir la equivocada.
 * - `enumerateDevices()` devuelve los `label` **vacíos** hasta que el usuario
 *   concede permiso una vez, así que el menú necesita un botón que pida
 *   permiso y vuelva a enumerar (mismo patrón que la pantalla de configuración
 *   de Átomos de Píxel, `lib/bibliotecas/atomosPixel/pantallaConfig.ts`).
 * - El `<video>` de `createCapture` queda con `display:none` al llamar
 *   `.hide()`, y un video oculto así puede quedar sin decodificar frames — lo
 *   que rompe cualquier inferencia por frame (MediaPipe y similares). Aquí se
 *   esconde moviéndolo fuera de pantalla, que sí sigue reproduciendo.
 *
 * El `<video>` se crea con `p.createElement`, así vive dentro del contenedor
 * del sketch: p5 lo destruye en `instance.remove()` y `P5Sketch.tsx` además
 * apaga el `MediaStream` al desmontar la pieza.
 */

/** Valor de la opción "sin cámara" del menú. */
export const SIN_CAMARA = "__sin_camara__";

const ESTILO_CAMPO: Record<string, string> = {
  background: "#0a140d",
  color: "#7fffa8",
  border: "1px solid #143b22",
  "border-radius": "4px",
  "font-family": "monospace",
  "font-size": "12px",
  padding: "6px 8px",
  "min-height": "44px", // objetivo táctil cómodo
  "box-sizing": "border-box",
};

function aplicarEstilo(el: p5.Element, extra: Record<string, string> = {}): void {
  for (const [k, v] of Object.entries({ ...ESTILO_CAMPO, ...extra })) el.style(k, v);
}

/** Lista las cámaras disponibles (labels vacíos si aún no hay permiso). */
export async function enumerarCamaras(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    return dispositivos.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}

/**
 * Pide permiso de cámara con un `getUserMedia` efímero (corta los tracks al
 * instante). Solo sirve para que `enumerateDevices` devuelva los nombres
 * reales de los dispositivos.
 */
export async function pedirPermiso(): Promise<boolean> {
  try {
    const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
    tmp.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export interface SelectorCamaraOpciones {
  /** Ancho del menú en px. Por defecto 200. */
  ancho?: number;
  /** Incluir la opción "— sin cámara —". Por defecto false. */
  permitirNinguna?: boolean;
  /** Se llama al elegir un dispositivo (o `SIN_CAMARA`). */
  onCambio?: (deviceId: string) => void;
}

/**
 * Menú desplegable de cámaras + botón "Buscar" (pide permiso y re-enumera).
 * Se monta con `p.createSelect`/`p.createButton`: hereda el escalado
 * responsivo y la limpieza automática de `P5Sketch.tsx`.
 */
export class SelectorCamara {
  private p: p5;
  private menu: p5.Element;
  private boton: p5.Element;
  private onCambio?: (deviceId: string) => void;
  private permitirNinguna: boolean;
  /** Elección manual del usuario: gana sobre cualquier default al repoblar. */
  private eleccion: string | null = null;

  constructor(p: p5, opciones: SelectorCamaraOpciones = {}) {
    const { ancho = 200, permitirNinguna = false, onCambio } = opciones;
    this.p = p;
    this.onCambio = onCambio;
    this.permitirNinguna = permitirNinguna;

    this.menu = p.createSelect();
    aplicarEstilo(this.menu, { width: `${ancho}px` });
    (this.menu.elt as HTMLSelectElement).addEventListener("change", () => {
      this.eleccion = this.valor();
      this.onCambio?.(this.eleccion);
    });

    this.boton = p.createButton("Buscar cámaras");
    aplicarEstilo(this.boton, {
      color: "#00ff41",
      cursor: "pointer",
      "touch-action": "manipulation",
    });
    (this.boton.elt as HTMLElement).addEventListener("pointerup", (ev) => {
      ev.preventDefault();
      void this.buscar();
    });

    this.poblar([]);
    void this.refrescar(); // sin pedir permiso todavía (labels genéricos)
  }

  /** Pide permiso y vuelve a enumerar, ya con los nombres reales. */
  async buscar(): Promise<void> {
    await pedirPermiso();
    await this.refrescar();
    // Tras el permiso el dispositivo elegido puede haber cambiado de posición
    // en la lista; se notifica para que el consumidor reabra si hace falta.
    this.onCambio?.(this.valor());
  }

  /** Re-enumera sin pedir permiso. */
  async refrescar(): Promise<void> {
    this.poblar(await enumerarCamaras());
  }

  private poblar(camaras: MediaDeviceInfo[]): void {
    const el = this.menu.elt as HTMLSelectElement;
    el.innerHTML = "";
    camaras.forEach((c, i) => {
      const opcion = document.createElement("option");
      opcion.value = c.deviceId;
      opcion.text = c.label || `Cámara ${i + 1}`;
      el.add(opcion);
    });
    if (this.permitirNinguna || camaras.length === 0) {
      const ninguna = document.createElement("option");
      ninguna.value = SIN_CAMARA;
      ninguna.text = camaras.length === 0 ? "— sin cámaras —" : "— sin cámara —";
      el.add(ninguna);
    }
    // Prioridad: elección manual > primera cámara > sin cámara.
    if (this.eleccion && Array.from(el.options).some((o) => o.value === this.eleccion)) {
      el.value = this.eleccion;
    } else if (camaras.length > 0) {
      el.value = camaras[0].deviceId;
    } else {
      el.value = SIN_CAMARA;
    }
  }

  /** `deviceId` elegido, o `SIN_CAMARA`. */
  valor(): string {
    return (this.menu.elt as HTMLSelectElement).value || SIN_CAMARA;
  }

  /** Coloca menú y botón: el botón queda debajo del menú. */
  position(x: number, y: number): this {
    this.menu.position(x, y);
    this.boton.position(x, y + 48);
    return this;
  }
}

/**
 * Stream de cámara abierto sobre un `<video>` propio. `abrir()` es
 * reentrante: llamarla con otro `deviceId` cierra el anterior y abre el nuevo.
 */
export class Camara {
  /** `<video>` con el stream; `undefined` mientras no se haya abierto. */
  elemento?: p5.Element;
  /** Mensaje del último fallo de `abrir()`. */
  error = "";

  private p: p5;
  private stream?: MediaStream;

  constructor(p: p5) {
    this.p = p;
  }

  /** Hay stream y el video ya tiene frames decodificados. */
  get listo(): boolean {
    const video = this.video;
    return !!video && video.readyState >= 2 && video.videoWidth > 0;
  }

  get video(): HTMLVideoElement | undefined {
    return this.elemento?.elt as HTMLVideoElement | undefined;
  }

  /**
   * Abre la cámara indicada. `deviceId` vacío o `SIN_CAMARA` = la que elija el
   * navegador. Lanza si el usuario niega el permiso o no hay dispositivo.
   */
  async abrir(deviceId?: string): Promise<void> {
    this.cerrar();
    this.error = "";
    const usarId = deviceId && deviceId !== SIN_CAMARA;
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: usarId
        ? { deviceId: { exact: deviceId }, width: { ideal: 640 } }
        : { width: { ideal: 640 } },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // `exact` falla si el dispositivo desapareció (se desconectó la webcam
      // o el id quedó viejo): se reintenta con la cámara por defecto.
      if (!usarId) throw err;
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 640 } },
      });
    }

    // `p.createElement` deja el <video> dentro del contenedor del sketch, así
    // p5 lo destruye al desmontar y `P5Sketch.tsx` apaga el MediaStream.
    this.elemento = this.p.createElement("video");
    const video = this.video as HTMLVideoElement;
    video.srcObject = this.stream;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    // Fuera de pantalla en vez de `display:none`: un video oculto con
    // `display:none` puede dejar de decodificar frames y congelar la
    // inferencia por frame.
    this.elemento.style("position", "absolute");
    this.elemento.style("left", "-10000px");
    this.elemento.style("top", "0");
    this.elemento.style("width", "320px");
    await video.play();
  }

  /** Corta el stream y elimina el `<video>`. */
  cerrar(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    this.elemento?.remove();
    this.elemento = undefined;
  }
}
