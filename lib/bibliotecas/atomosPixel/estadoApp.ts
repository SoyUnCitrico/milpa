// Estado de la aplicación (port directo de AppState.pde).

import type { Barrido, Modo } from "./tipos";

export class EstadoApp {
  /** true: vista previa de la fuente en vivo / false: modo partículas. */
  cameraMode = true;
  /** Play / pausa de la animación. */
  playing = false;
  /** Mostrar el flow field (debug visual). */
  showField = false;
  /** Dirección del barrido (modo SWEEP). */
  sweepDirection: Barrido = "DOWN";
  /** Modo de animación activo. */
  mode: Modo = "ORIGINAL";

  togglePlaying(): void {
    this.playing = !this.playing;
  }

  toggleField(): void {
    this.showField = !this.showField;
  }
}
