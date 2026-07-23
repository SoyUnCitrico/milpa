import type p5 from "p5";

export interface BotonOpciones {
  /** Texto visible del botón (p. ej. "Reiniciar", "Audio"). */
  etiqueta: string;
  /**
   * Si se define, el botón es un **interruptor**: alterna entre encendido y
   * apagado y muestra el estado (`ON`/`OFF`) junto a la etiqueta.
   */
  alternar?: boolean;
  /** Estado inicial cuando `alternar` es true. Por defecto `false`. */
  activo?: boolean;
  /** Ancho mínimo en px. Por defecto 0 (se ajusta al texto). */
  ancho?: number;
  /**
   * Acento del botón: `"verde"` (estructura, por defecto) o `"naranja"`
   * (acción destacada / CTA). Sigue la regla de la paleta del sitio: el naranja
   * es puntual, no se inunda la UI con él.
   */
  acento?: "verde" | "naranja";
  /** Se llama en cada pulsación; recibe el estado si el botón es interruptor. */
  onPress?: (activo: boolean) => void;
}

/** Tokens de la paleta del sitio (ver `tailwind.config.ts`). */
const COLORES = {
  panel: "#0a140d",
  linea: "#143b22",
  texto: "#7fffa8",
  verde: "#00ff41",
  naranja: "#ff8c1a",
  ambar: "#ffae42",
} as const;

/**
 * Botón táctil de los sketches: reemplaza el `p.createButton` + helper de
 * estilo `estiloDOM`/`estiloControl` que cada pieza redefinía por su cuenta
 * (ver `terrenoRuido.ts`, `soundCollider.ts`, `fftVisualization.ts`).
 *
 * Igual que `Knob` (`lib/bibliotecas/knob.ts`) se monta con `p.createButton`,
 * así hereda el escalado responsivo y la limpieza automática de
 * `P5Sketch.tsx` (p5 destruye todo lo creado con `createX` en
 * `instance.remove()`).
 *
 * Interacción por Pointer Events (mouse/touch/pen unificados) con altura
 * mínima de 44 px y `touch-action: manipulation`, para que sea pulsable con el
 * dedo sin el retardo de doble tap ni scroll accidental.
 */
export class Boton {
  elemento: p5.Element;
  private etiqueta: string;
  private esAlternar: boolean;
  private encendido: boolean;
  private acento: string;
  private onPress?: (activo: boolean) => void;

  constructor(p: p5, opciones: BotonOpciones) {
    const {
      etiqueta,
      alternar = false,
      activo = false,
      ancho = 0,
      acento = "verde",
      onPress,
    } = opciones;

    this.etiqueta = etiqueta;
    this.esAlternar = alternar;
    this.encendido = activo;
    this.acento = acento === "naranja" ? COLORES.naranja : COLORES.verde;
    this.onPress = onPress;

    this.elemento = p.createButton(this.textoActual());
    this.elemento.style("background", COLORES.panel);
    this.elemento.style("color", COLORES.texto);
    this.elemento.style("border", `1px solid ${COLORES.linea}`);
    this.elemento.style("border-radius", "4px");
    this.elemento.style("font-family", "monospace");
    this.elemento.style("font-size", "12px");
    this.elemento.style("padding", "0 14px");
    this.elemento.style("min-height", "44px"); // objetivo táctil cómodo
    this.elemento.style("touch-action", "manipulation");
    this.elemento.style("user-select", "none");
    this.elemento.style("cursor", "pointer");
    if (ancho > 0) this.elemento.style("min-width", `${ancho}px`);

    const elt = this.elemento.elt as HTMLElement;
    // `pointerup` (no `click`) para responder igual a dedo, mouse y lápiz.
    elt.addEventListener("pointerup", (ev: PointerEvent) => {
      ev.preventDefault();
      if (this.esAlternar) this.encendido = !this.encendido;
      this.actualizarVisual();
      this.onPress?.(this.encendido);
    });
    elt.addEventListener("pointerdown", (ev: PointerEvent) => {
      ev.preventDefault();
      this.elemento.style("border-color", COLORES.naranja);
      this.elemento.style("color", COLORES.ambar);
    });
    elt.addEventListener("pointerleave", () => this.actualizarVisual());
    elt.addEventListener("pointercancel", () => this.actualizarVisual());

    this.actualizarVisual();
  }

  private textoActual(): string {
    if (!this.esAlternar) return this.etiqueta;
    return `${this.etiqueta}: ${this.encendido ? "ON" : "OFF"}`;
  }

  private actualizarVisual() {
    this.elemento.html(this.textoActual());
    const prendido = this.esAlternar && this.encendido;
    this.elemento.style("border-color", prendido ? this.acento : COLORES.linea);
    this.elemento.style("color", prendido ? this.acento : COLORES.texto);
  }

  /** Etiqueta nueva (para botones que reflejan un valor cambiante). */
  texto(nueva: string): this {
    this.etiqueta = nueva;
    this.actualizarVisual();
    return this;
  }

  /** Lee el estado (interruptor) o lo fija sin disparar `onPress`. */
  valor(): boolean;
  valor(v: boolean): this;
  valor(v?: boolean): boolean | this {
    if (v === undefined) return this.encendido;
    this.encendido = v;
    this.actualizarVisual();
    return this;
  }

  position(x: number, y: number): this {
    this.elemento.position(x, y);
    return this;
  }

  style(prop: string, valor?: string): this {
    if (valor === undefined) this.elemento.style(prop);
    else this.elemento.style(prop, valor);
    return this;
  }
}

/**
 * Panel de texto para el HUD de una pieza (estado de la cámara, lectura de
 * gestos, etc.). Es un `createDiv` y no `p.text()` por dos razones que se
 * repiten en las piezas de la galería:
 *
 * - En **WEBGL**, `text()` exige una fuente cargada con `loadFont`.
 * - En las piezas de **fondo translúcido** (las que dejan estela), el texto
 *   dibujado en el canvas nunca se borra del todo y se va sobreimprimiendo
 *   frame a frame hasta volverse ilegible.
 *
 * `actualizar()` sólo toca el DOM cuando el texto cambia.
 */
export class PanelEstado {
  private elemento: p5.Element;
  private ultimo = "";

  constructor(p: p5) {
    this.elemento = p.createDiv("");
    this.elemento.style("background", COLORES.panel);
    this.elemento.style("color", COLORES.texto);
    this.elemento.style("border", `1px solid ${COLORES.linea}`);
    this.elemento.style("border-radius", "4px");
    this.elemento.style("font-family", "monospace");
    this.elemento.style("font-size", "11px");
    this.elemento.style("padding", "4px 8px");
    this.elemento.style("pointer-events", "none");
    this.elemento.style("white-space", "nowrap");
  }

  /** Texto nuevo; cadena vacía oculta el panel. */
  actualizar(texto: string): this {
    if (texto === this.ultimo) return this;
    this.ultimo = texto;
    this.elemento.html(texto);
    this.elemento.style("display", texto ? "block" : "none");
    return this;
  }

  position(x: number, y: number): this {
    this.elemento.position(x, y);
    return this;
  }
}
