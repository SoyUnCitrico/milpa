// Controlador de interacciones (port de InteractionController.pde): centraliza
// TODOS los comandos de la aplicación. El teclado (handleKey) y los botones
// táctiles llaman a estos mismos comandos, así la lógica vive en un solo lugar.
// (El OSC del original queda excluido del port.)

import type { ContextoAtomos, Barrido, Modo } from "./tipos";
import { LISTA_MODOS, MODOS, modoPorTecla } from "./tipos";
import { Repulsor } from "./repulsor";
import { acotar, aleatorio } from "./colorUtil";

/**
 * Acciones de orquestación que viven en la factory (equivalentes a las
 * funciones globales del sketch original: setMode, togglePhoto, etc.).
 */
export interface AccionesApp {
  setMode(m: Modo): void;
  togglePhoto(): void;
  cargarImagen(): void;
  rebuildColonizer(): void;
}

export class ControlInteraccion {
  constructor(
    private ctx: ContextoAtomos,
    private app: AccionesApp,
  ) {}

  /////////////////// COMANDOS ///////////////////

  // --- Reproducción / fuente ---
  play(): void {
    this.ctx.state.togglePlaying();
  }

  reset(): void {
    const { state, cluster } = this.ctx;
    if (state.playing && cluster) {
      cluster.reset();
      this.app.setMode("ORIGINAL");
    }
  }

  capturePhoto(): void {
    this.app.togglePhoto();
  }

  loadImage(): void {
    this.app.cargarImagen();
  }

  // --- Modos de animación ---
  selectMode(m: Modo): void {
    this.app.setMode(m);
  }

  /** Selección por índice 1..N (orden de declaración de MODOS). */
  selectModeIndex(index: number): void {
    if (index >= 1 && index <= LISTA_MODOS.length) {
      this.app.setMode(LISTA_MODOS[index - 1]);
    }
  }

  /** Cicla al siguiente modo (para el botón táctil "Modo ▸"). */
  cycleMode(): Modo {
    const i = LISTA_MODOS.indexOf(this.ctx.state.mode);
    const siguiente = LISTA_MODOS[(i + 1) % LISTA_MODOS.length];
    this.app.setMode(siguiente);
    return siguiente;
  }

  sweepDirection(dir: Barrido): void {
    this.ctx.state.sweepDirection = dir;
  }

  /** Explosión: repulsor transitorio en un punto aleatorio del canvas. */
  explosion(): void {
    const { ctx } = this;
    ctx.repulsors.push(
      new Repulsor(aleatorio(0, ctx.W), aleatorio(0, ctx.H), 250, 160, 12),
    );
  }

  // --- Flow field ---
  toggleField(): void {
    this.ctx.state.toggleField();
  }

  fieldNoise(): void {
    this.ctx.campo?.transitionToNoise();
  }

  fieldImage(): void {
    const { campo, img } = this.ctx;
    if (campo && img) campo.transitionToImage(img);
  }

  fieldRadial(): void {
    this.ctx.campo?.transitionToRadial();
  }

  fieldCircular(): void {
    this.ctx.campo?.transitionToCircular();
  }

  fieldHeart(): void {
    this.ctx.campo?.transitionToHeart();
  }

  fieldInfinity(): void {
    this.ctx.campo?.transitionToInfinity();
  }

  fieldSpiral(): void {
    this.ctx.campo?.transitionToSpiral();
  }

  // --- Partículas ---
  changeShape(): void {
    this.ctx.render.cycleParticleShape();
  }

  toggleLife(): void {
    this.ctx.cluster?.cambiarLifeMode();
  }

  changeSpeed(delta: number): void {
    this.ctx.cluster?.changeSpeed(delta);
  }

  // --- Render ---
  cycleBackground(): void {
    this.ctx.render.cycleBackground();
  }

  toggleAdditive(): void {
    this.ctx.render.toggleAdditive();
  }

  toggleDynamicSize(): void {
    this.ctx.render.toggleDynamicSize();
  }

  changeTrailFade(delta: number): void {
    this.ctx.render.changeTrailFade(delta);
  }

  // --- Tipografía (forma CHAR / estilo ASCII-Matrix) ---
  cycleTextColor(): void {
    this.ctx.render.cycleTextColor();
  }

  toggleTextBold(): void {
    this.ctx.render.toggleTextBold();
  }

  changeTextSize(delta: number): void {
    this.ctx.render.changeTextSize(delta);
  }

  /** Fija el texto que "escriben" las partículas (CHAR). Vacío = ASCII art. */
  setText(t: string): void {
    this.ctx.asciiText = t ?? "";
    this.ctx.cluster?.setText(this.ctx.asciiText);
  }

  // --- Colonización de espacios ---
  changeColonizeThreshold(delta: number): void {
    this.setColonizeThreshold(this.ctx.colonizeThreshold + delta);
  }

  setColonizeThreshold(v: number): void {
    this.ctx.colonizeThreshold = acotar(v, 0, 255);
    // Si el modo está activo, reconstruye para re-elegir las semillas.
    if (this.ctx.state.mode === "COLONIZE") {
      this.app.rebuildColonizer();
    }
  }

  /////////////////// ENTRADA POR TECLADO ///////////////////

  handleKey(key: string, keyCode: number): void {
    const p = this.ctx.p;

    // Flechas: orientan el barrido (modo SWEEP).
    if (keyCode === p.LEFT_ARROW) return this.sweepDirection("LEFT");
    if (keyCode === p.UP_ARROW) return this.sweepDirection("UP");
    if (keyCode === p.RIGHT_ARROW) return this.sweepDirection("RIGHT");
    if (keyCode === p.DOWN_ARROW) return this.sweepDirection("DOWN");

    if (!key || key.length !== 1) return;

    // Teclas de modo (números y letras declaradas en MODOS).
    const modo = modoPorTecla(key.toLowerCase());
    if (modo) {
      this.selectMode(modo);
      return;
    }

    // Letras y símbolos: acciones y toggles (insensible a mayúsculas).
    switch (key.toLowerCase()) {
      case "b": this.cycleBackground(); break;
      case "[": this.changeTrailFade(-5); break;
      case "]": this.changeTrailFade(5); break;
      case "m": this.toggleAdditive(); break;
      case "n": this.toggleDynamicSize(); break;
      case "j": this.cycleTextColor(); break;
      case "k": this.toggleTextBold(); break;
      case ",": this.changeTextSize(-0.1); break;
      case ".": this.changeTextSize(0.1); break;
      case "u": this.changeColonizeThreshold(-5); break;
      case "i": this.changeColonizeThreshold(5); break;
      case "q": this.fieldHeart(); break;
      case "y": this.fieldInfinity(); break;
      case "z": this.fieldSpiral(); break;
      case " ": this.explosion(); break;
      case "c": this.toggleField(); break;
      case "d": this.fieldNoise(); break;
      case "e": this.fieldImage(); break;
      case "f": this.fieldRadial(); break;
      case "g": this.fieldCircular(); break;
      case "p": this.play(); break;
      case "r": this.reset(); break;
      case "s": this.changeShape(); break;
      case "l": this.loadImage(); break;
      case "t": this.capturePhoto(); break;
      case "v": this.toggleLife(); break;
      case "+": this.changeSpeed(0.2); break;
      case "-": this.changeSpeed(-0.2); break;
    }
  }

  /** Etiqueta del modo activo (para HUD/botones). */
  etiquetaModo(): string {
    return MODOS[this.ctx.state.mode].label;
  }
}
