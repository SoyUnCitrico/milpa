import type p5 from "p5";

export interface KnobOpciones {
  /** Texto visible: para qué sirve el knob (p. ej. "Frecuencia"). */
  etiqueta: string;
  min: number;
  max: number;
  /** Valor inicial. Por defecto `min`. */
  valor?: number;
  /** Incremento mínimo. Por defecto (max - min) / 1000. */
  paso?: number;
  /** Diámetro del dial en px. Por defecto 48. */
  diametro?: number;
  /** Píxeles de arrastre vertical para cubrir todo el rango. Por defecto 160. */
  sensibilidad?: number;
  onChange?: (valor: number) => void;
}

/**
 * Input giratorio: reemplaza `p.createSlider` en los sketches con controles de
 * audio. Se monta con `p.createDiv` (mismo mecanismo que un slider), así
 * hereda el escalado responsivo y la limpieza automática de `P5Sketch.tsx`
 * (p5 destruye todo lo creado con `createX` al llamar `instance.remove()`).
 *
 * Interacción por Pointer Events (mouse/touch/pen unificados): arrastre
 * vertical, arriba incrementa. `touch-action: none` evita que el drag
 * scrollee la página en móvil.
 */
export class Knob {
  contenedor: p5.Element;
  private dial: p5.Element;
  private indicador!: p5.Element;
  private etiquetaEl: p5.Element;
  private valorEl: p5.Element;
  private min: number;
  private max: number;
  private paso: number;
  private sensibilidad: number;
  private actual: number;
  private onChange?: (valor: number) => void;
  private arrastrando = false;
  private inicioY = 0;
  private valorInicio = 0;

  constructor(p: p5, opciones: KnobOpciones) {
    const {
      etiqueta,
      min,
      max,
      valor = min,
      paso = (max - min) / 1000,
      diametro = 48,
      sensibilidad = 160,
      onChange,
    } = opciones;

    this.min = min;
    this.max = max;
    this.paso = paso;
    this.sensibilidad = sensibilidad;
    this.actual = p.constrain(valor, min, max);
    this.onChange = onChange;

    this.contenedor = p.createDiv("");
    this.contenedor.style("display", "inline-flex");
    this.contenedor.style("flex-direction", "column");
    this.contenedor.style("align-items", "center");
    this.contenedor.style("gap", "2px");
    this.contenedor.style("font-family", "inherit");
    this.contenedor.style("user-select", "none");
    this.contenedor.style("width", `${Math.max(diametro, 44)}px`);

    this.etiquetaEl = p.createDiv(etiqueta);
    this.etiquetaEl.parent(this.contenedor);
    this.etiquetaEl.style("font-size", "10px");
    this.etiquetaEl.style("opacity", "0.8");
    this.etiquetaEl.style("text-align", "center");
    this.etiquetaEl.style("line-height", "1.1");
    this.etiquetaEl.style("pointer-events", "none");

    this.dial = p.createDiv("");
    this.dial.parent(this.contenedor);
    const hit = Math.max(diametro, 44);
    this.dial.style("width", `${hit}px`);
    this.dial.style("height", `${hit}px`);
    this.dial.style("border-radius", "50%");
    this.dial.style("box-sizing", "border-box");
    this.dial.style("touch-action", "none");
    this.dial.style("cursor", "grab");
    this.dial.style("background", "#0a140d");
    this.dial.style("border", "2px solid #143b22");
    this.dial.style("position", "relative");

    const indicador = p.createDiv("");
    indicador.parent(this.dial);
    indicador.style("position", "absolute");
    indicador.style("top", "3px");
    indicador.style("left", "50%");
    indicador.style("width", "3px");
    indicador.style("height", `${diametro * 0.35}px`);
    indicador.style("background", "#00ff41");
    indicador.style("transform-origin", `50% ${diametro * 0.45}px`);
    indicador.style("pointer-events", "none");
    this.indicador = indicador;

    this.valorEl = p.createDiv("");
    this.valorEl.parent(this.contenedor);
    this.valorEl.style("font-size", "9px");
    this.valorEl.style("opacity", "0.6");
    this.valorEl.style("pointer-events", "none");

    const dialElt = this.dial.elt as HTMLElement;
    dialElt.addEventListener("pointerdown", (ev: PointerEvent) => {
      this.arrastrando = true;
      this.inicioY = ev.clientY;
      this.valorInicio = this.actual;
      this.dial.style("cursor", "grabbing");
      dialElt.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });
    dialElt.addEventListener("pointermove", (ev: PointerEvent) => {
      if (!this.arrastrando) return;
      const deltaY = this.inicioY - ev.clientY;
      const rango = this.max - this.min;
      const deltaValor = (deltaY / this.sensibilidad) * rango;
      this.set(this.valorInicio + deltaValor);
    });
    const soltar = (ev: PointerEvent) => {
      if (!this.arrastrando) return;
      this.arrastrando = false;
      this.dial.style("cursor", "grab");
      try {
        dialElt.releasePointerCapture(ev.pointerId);
      } catch {
        /* noop: el pointer ya pudo perderse (touch cancel) */
      }
    };
    dialElt.addEventListener("pointerup", soltar);
    dialElt.addEventListener("pointercancel", soltar);

    this.actualizarVisual();
  }

  private set(valor: number) {
    const pasos = Math.round((valor - this.min) / this.paso);
    const cuantizado = p5UtilConstrain(this.min + pasos * this.paso, this.min, this.max);
    if (cuantizado === this.actual) return;
    this.actual = cuantizado;
    this.actualizarVisual();
    this.onChange?.(this.actual);
  }

  private actualizarVisual() {
    const rango = this.max - this.min;
    const frac = rango === 0 ? 0 : (this.actual - this.min) / rango;
    const grados = -135 + frac * 270;
    this.indicador.style("transform", `rotate(${grados}deg)`);
    this.valorEl.html(this.formatoValor());
  }

  private formatoValor(): string {
    return Number.isInteger(this.paso) ? String(this.actual) : this.actual.toFixed(2);
  }

  position(x: number, y: number): this {
    this.contenedor.position(x, y);
    return this;
  }

  style(prop: string): this {
    this.contenedor.style(prop);
    return this;
  }

  value(): number;
  value(v: number): this;
  value(v?: number): number | this {
    if (v === undefined) return this.actual;
    this.set(v);
    return this;
  }
}

function p5UtilConstrain(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
