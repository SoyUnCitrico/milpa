// Pantalla de configuración inicial (port simplificado de ConfigScreen.pde +
// Config.pde, sin los campos OSC): selector de cámara, cellSize, flockCellSize
// y el texto del modo letra. Los controles son elementos DOM creados por p5
// (el wrapper de la galería los escala junto con el canvas) y la persistencia
// es localStorage en vez de config.json.
//
// Los labels de enumerateDevices() llegan vacíos hasta que el usuario concede
// permiso: el botón "Buscar cámaras" pide getUserMedia (y corta los tracks al
// instante) solo para poblar la lista con nombres reales.

import type p5 from "p5";
import type { ContextoAtomos } from "./tipos";
import { guardarConfig, type ConfigAtomos } from "./configuracion";

/** Valor "sin cámara" del selector (inicia pidiendo una imagen de archivo). */
const SIN_CAMARA = "__sin_camara__";

const ESTILO_CAMPO: Record<string, string> = {
  background: "#0a140d",
  color: "#7fffa8",
  border: "1px solid #143b22",
  "font-family": "monospace",
  "font-size": "14px",
  padding: "4px 6px",
  "box-sizing": "border-box",
};

const ESTILO_BOTON: Record<string, string> = {
  ...ESTILO_CAMPO,
  color: "#00ff41",
  cursor: "pointer",
};

function aplicarEstilo(el: p5.Element, estilo: Record<string, string>): void {
  for (const [k, v] of Object.entries(estilo)) el.style(k, v);
}

function parseIntOr(v: string, porDefecto: number): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : porDefecto;
}

export class PantallaConfig {
  private ctx: ContextoAtomos;
  private alIniciar: (cfg: ConfigAtomos, conCamara: boolean) => void;
  private elementos: p5.Element[] = [];
  private selCamara: p5.Element | null = null;
  private inCell: p5.Element | null = null;
  private inFlock: p5.Element | null = null;
  private taTexto: p5.Element | null = null;
  private mensaje = "";
  private activa = false;
  /** Última opción elegida a mano por el usuario (gana a cualquier default). */
  private eleccionUsuario: string | null = null;

  constructor(
    ctx: ContextoAtomos,
    alIniciar: (cfg: ConfigAtomos, conCamara: boolean) => void,
  ) {
    this.ctx = ctx;
    this.alIniciar = alIniciar;
  }

  /** Crea los controles DOM (llamar una vez, desde setup). */
  construir(): void {
    const p = this.ctx.p;
    const W = this.ctx.W;
    const cfg = this.ctx.config;
    const x0 = Math.floor(W / 2 - 160);
    const ancho = 320;
    this.activa = true;

    const sel = p.createSelect();
    sel.position(x0, 170);
    sel.style("width", `${ancho}px`);
    aplicarEstilo(sel, ESTILO_CAMPO);
    (sel.elt as HTMLSelectElement).addEventListener("change", () => {
      this.eleccionUsuario = (sel.elt as HTMLSelectElement).value;
    });
    this.selCamara = sel;
    this.registrar(sel);
    this.poblarCamaras([]);
    void this.enumerar(); // sin pedir permiso aún (labels genéricos)

    const btnBuscar = p.createButton("Buscar cámaras (pide permiso)");
    btnBuscar.position(x0, 205);
    btnBuscar.style("width", `${ancho}px`);
    aplicarEstilo(btnBuscar, ESTILO_BOTON);
    btnBuscar.mousePressed(() => void this.buscarCamaras());
    this.registrar(btnBuscar);

    const inCell = p.createInput(String(cfg.cellSize));
    inCell.position(x0, 285);
    inCell.style("width", `${ancho / 2 - 5}px`);
    aplicarEstilo(inCell, ESTILO_CAMPO);
    (inCell.elt as HTMLInputElement).type = "number";
    this.inCell = inCell;
    this.registrar(inCell);

    const inFlock = p.createInput(String(cfg.flockCellSize));
    inFlock.position(x0 + ancho / 2 + 5, 285);
    inFlock.style("width", `${ancho / 2 - 5}px`);
    aplicarEstilo(inFlock, ESTILO_CAMPO);
    (inFlock.elt as HTMLInputElement).type = "number";
    this.inFlock = inFlock;
    this.registrar(inFlock);

    const ta = p.createElement("textarea", cfg.asciiText);
    ta.position(x0, 360);
    ta.style("width", `${ancho}px`);
    ta.style("height", "110px");
    ta.style("resize", "none");
    aplicarEstilo(ta, ESTILO_CAMPO);
    this.taTexto = ta;
    this.registrar(ta);

    const btnIniciar = p.createButton("Iniciar ▶");
    btnIniciar.position(x0, 495);
    btnIniciar.style("width", `${ancho}px`);
    btnIniciar.style("font-size", "16px");
    aplicarEstilo(btnIniciar, ESTILO_BOTON);
    btnIniciar.mousePressed(() => this.iniciar());
    this.registrar(btnIniciar);
  }

  /** Dibuja el fondo/labels de la pantalla (una vez por frame, en el canvas). */
  dibujar(): void {
    const p = this.ctx.p;
    const W = this.ctx.W;
    const x0 = Math.floor(W / 2 - 160);
    p.background(5, 8, 5);
    p.noStroke();
    p.textFont("monospace");
    p.textStyle(p.NORMAL);

    p.fill(0, 255, 65);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(26);
    p.text("Átomos de Píxel", W / 2, 70);
    p.textSize(13);
    p.fill(127, 255, 168);
    p.text("la imagen se descompone en partículas de color", W / 2, 100);

    p.textAlign(p.LEFT, p.BOTTOM);
    p.textSize(13);
    p.text("Cámara", x0, 165);
    p.text("Tamaño de celda", x0, 280);
    p.text("Celda de manada", x0 + 165, 280);
    p.text("Texto del modo letra (vacío = ASCII por brillo)", x0, 355);

    if (this.mensaje) {
      p.fill(255, 140, 26);
      p.textAlign(p.CENTER, p.TOP);
      p.text(this.mensaje, W / 2, 540);
    }
  }

  estaActiva(): boolean {
    return this.activa;
  }

  /** Elimina todos los controles DOM. */
  destruir(): void {
    for (const el of this.elementos) el.remove();
    this.elementos = [];
    this.activa = false;
  }

  //////////////////  INTERNOS  //////////////////

  private registrar(el: p5.Element): void {
    this.elementos.push(el);
  }

  /** Pide permiso de cámara (getUserMedia efímero) y re-enumera con labels. */
  private async buscarCamaras(): Promise<void> {
    this.mensaje = "";
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach((t) => t.stop());
    } catch (e) {
      this.mensaje =
        "Sin acceso a la cámara (" +
        (e instanceof Error ? e.name : "error") +
        "): puedes iniciar sin cámara y cargar una imagen.";
    }
    await this.enumerar();
  }

  private async enumerar(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      this.poblarCamaras([]);
      return;
    }
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      this.poblarCamaras(devs.filter((d) => d.kind === "videoinput"));
    } catch {
      this.poblarCamaras([]);
    }
  }

  private poblarCamaras(camaras: MediaDeviceInfo[]): void {
    const sel = this.selCamara;
    if (!sel) return;
    const el = sel.elt as HTMLSelectElement;
    el.innerHTML = "";
    camaras.forEach((c, i) => {
      const opt = document.createElement("option");
      opt.value = c.deviceId;
      opt.text = c.label || `Cámara ${i + 1}`;
      el.add(opt);
    });
    const sinCam = document.createElement("option");
    sinCam.value = SIN_CAMARA;
    sinCam.text = "— sin cámara (cargar imagen) —";
    el.add(sinCam);
    // Prioridad: elección manual del usuario > cámara guardada en config >
    // primera cámara disponible. (El placeholder inicial NO cuenta como
    // elección: si no, el repoblado async dejaría "sin cámara" fijado.)
    const preferida = this.eleccionUsuario ?? this.ctx.config.cameraId ?? "";
    if (preferida && Array.from(el.options).some((o) => o.value === preferida)) {
      el.value = preferida;
    } else if (camaras.length > 0) {
      el.value = camaras[0].deviceId;
    } else {
      el.value = SIN_CAMARA;
    }
  }

  private iniciar(): void {
    const eleccion = (this.selCamara?.elt as HTMLSelectElement | undefined)?.value ?? SIN_CAMARA;
    const conCamara = eleccion !== SIN_CAMARA && eleccion !== "";
    const cfg: ConfigAtomos = {
      cellSize: parseIntOr(String(this.inCell?.value() ?? ""), this.ctx.config.cellSize),
      flockCellSize: parseIntOr(String(this.inFlock?.value() ?? ""), this.ctx.config.flockCellSize),
      asciiText: String(this.taTexto?.value() ?? ""),
      cameraId: conCamara ? eleccion : undefined,
    };
    guardarConfig(cfg);
    this.destruir();
    this.alIniciar(cfg, conCamara);
  }
}
