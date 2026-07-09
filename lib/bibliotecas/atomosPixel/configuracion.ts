// Configuración persistente (port de Config.pde, sin los campos OSC).
// El config.json del sketch de Processing se reemplaza por localStorage.

export interface ConfigAtomos {
  /** Tamaño de celda/partícula por defecto. */
  cellSize: number;
  /** Tamaño de celda exclusivo del modo FLOCK (menos agentes, más nítido). */
  flockCellSize: number;
  /** Texto del modo letra (forma CHAR); "" = ASCII art por brillo. */
  asciiText: string;
  /** deviceId de la cámara elegida (undefined = cámara por defecto). */
  cameraId?: string;
}

const CLAVE = "milpa:atomos-pixel:config";

export const CONFIG_DEFAULT: ConfigAtomos = {
  cellSize: 12,
  flockCellSize: 24,
  asciiText: "",
};

/** Tamaño de celda de las composiciones generativas (líneas/círculos/rects). */
export const COMPOSE_CELL_SIZE = 20;

// Topes de seguridad: nº máximo de partículas que puede producir una config
// agresiva (el cellSize efectivo se eleva para no pasarse). Con los defaults
// no recortan nada (1280×720 / 12² ≈ 6400).
export const MAX_PARTICULAS = 8000;
export const MAX_FLOCK = 2500;

/** cellSize efectivo para que `W×H / cell²` no supere `maxParticulas`. */
export function cellSizeEfectivo(
  cell: number,
  W: number,
  H: number,
  maxParticulas: number,
): number {
  return Math.max(cell, Math.ceil(Math.sqrt((W * H) / maxParticulas)));
}

/** Carga la última config guardada (o los defaults si no hay/está corrupta). */
export function cargarConfig(): ConfigAtomos {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return { ...CONFIG_DEFAULT };
    const j = JSON.parse(crudo) as Partial<ConfigAtomos>;
    return {
      cellSize: Number(j.cellSize) > 0 ? Number(j.cellSize) : CONFIG_DEFAULT.cellSize,
      flockCellSize:
        Number(j.flockCellSize) > 0 ? Number(j.flockCellSize) : CONFIG_DEFAULT.flockCellSize,
      asciiText: typeof j.asciiText === "string" ? j.asciiText : "",
      cameraId: typeof j.cameraId === "string" ? j.cameraId : undefined,
    };
  } catch {
    return { ...CONFIG_DEFAULT };
  }
}

export function guardarConfig(config: ConfigAtomos): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(config));
  } catch {
    // localStorage lleno o bloqueado: la config simplemente no persiste.
  }
}
