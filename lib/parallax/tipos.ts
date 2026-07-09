/**
 * Tipos compartidos de la escena parallax "Valle de la Milpa": el estado
 * mutable que cruza React ↔ p5 sin re-renders (el draw loop lo lee cada
 * frame; el componente y el fetch de clima escriben en él).
 */

export type CondicionClima = "despejado" | "nublado" | "lluvia";

export interface EstadoClima {
  condicion: CondicionClima;
  vientoKmh: number;
  /** Date.now() de la última consulta (0 = aún sin datos). */
  obtenidoEn: number;
}

/** Paleta del cielo para una hora dada (los buffers se hornean con ella). */
export interface PaletaCielo {
  cenit: string;
  horizonte: string;
  /** Color de bruma/lejanía: tiñe montaña, nubes y llovizna. */
  bruma: string;
  /** 0..1 — visibilidad de las estrellas. */
  estrellas: number;
  /** 0..1 — cuánta luz hay; bajo cierto umbral la fauna no sale. */
  luzFauna: number;
}

/** Overrides de prueba vía query params (?hora= ?clima= ?viento=). */
export interface OverridesEscena {
  hora?: number;
  condicion?: CondicionClima;
  vientoKmh?: number;
}

/**
 * Objeto mutable compartido entre el componente EscenaParallax y la factory
 * p5 (crearEscena). Nada de esto pasa por estado de React.
 */
export interface EstadoEscena {
  clima: EstadoClima;
  reducedMotion: boolean;
  /** Alto total del documento, cacheado por ResizeObserver en el componente. */
  docAlto: number;
  override: OverridesEscena;
}

export function crearEstadoEscena(): EstadoEscena {
  return {
    clima: { condicion: "despejado", vientoKmh: 0, obtenidoEn: 0 },
    reducedMotion: false,
    docAlto: 0,
    override: {},
  };
}
