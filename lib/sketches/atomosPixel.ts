import type p5 from "p5";
import type { SketchFactory } from "../types";
import {
  AjustesRender,
  ArchivoFuente,
  CamaraFuente,
  CampoFlujo,
  ClusterPixel,
  Colonizacion,
  ComposerPixel,
  ControlInteraccion,
  EstadoApp,
  MODOS,
  PantallaConfig,
  COMPOSE_CELL_SIZE,
  MAX_FLOCK,
  MAX_PARTICULAS,
  cargarConfig,
  cellSizeEfectivo,
  crearAnimaciones,
  type Animacion,
  type ConfigAtomos,
  type ContextoAtomos,
  type FuenteImagen,
  type Modo,
} from "../bibliotecas/atomosPixel";

/**
 * Átomos de Píxel — port a p5 (modo instancia) del sketch de Processing
 * `pixelAtomProject`: captura una imagen (webcam o archivo), la descompone en
 * partículas de color ("átomos") y las anima con steering behaviors,
 * composiciones generativas y colonización de espacios. Se excluye el control
 * OSC del original (requería un servidor local); ver
 * translations/translation_pixelAtomProject.md.
 *
 * El canvas elige su resolución lógica según la orientación: 1280×720 en
 * apaisado (desktop) y 540×960 en retrato (móvil); el wrapper P5Sketch adopta
 * las dimensiones reales del canvas para escalar.
 */
export const atomosPixel: SketchFactory = (p: p5) => {
  // Resolución lógica según orientación (ver P5Sketch: adopta el tamaño real).
  const vertical =
    typeof window !== "undefined" && window.innerWidth < window.innerHeight;
  const W = vertical ? 540 : 1280;
  const H = vertical ? 960 : 720;

  const ctx: ContextoAtomos = {
    p,
    W,
    H,
    render: new AjustesRender(),
    state: new EstadoApp(),
    config: cargarConfig(),
    repulsors: [],
    img: null,
    cluster: null,
    campo: null,
    composer: null,
    colonizer: null,
    asciiText: "",
    colonizeThreshold: 140,
    colonizeAttraction: 60,
    colonizeKill: 10,
    colonizeSeg: 6,
  };

  // Tamaños de celda efectivos (con tope de seguridad de nº de partículas);
  // se fijan al pulsar Iniciar en la pantalla de configuración.
  let cellSize = cellSizeEfectivo(ctx.config.cellSize, W, H, MAX_PARTICULAS);
  let flockCellSize = cellSizeEfectivo(ctx.config.flockCellSize, W, H, MAX_FLOCK);

  let animaciones: Record<Modo, Animacion>;
  let input: ControlInteraccion;
  let pantalla: PantallaConfig;
  let configurando = true;
  let lastMode: Modo | null = null;
  let colonizeBuffer: p5.Graphics | null = null;
  let fuente: FuenteImagen | null = null;
  let fileInput: p5.Element | null = null;
  let btnModo: p5.Element | null = null;
  let btnCaptura: p5.Element | null = null;

  /////////////////// ORQUESTACIÓN (equivale al sketch principal) //////////////

  /**
   * Cambia el modo activo. Reinicia lastMode para que enter() se dispare en el
   * siguiente play(), incluso al re-seleccionar el mismo modo (p. ej. volver a
   * pulsar la tecla de explosión la relanza).
   */
  const setMode = (mode: Modo): void => {
    ctx.state.mode = mode;
    lastMode = null;
    btnModo?.html(`Modo ▸ ${MODOS[mode].label}`);
  };

  /** Construye un cluster y le aplica el texto ASCII actual (si hay). */
  const makeCluster = (size: number): ClusterPixel | null => {
    if (!ctx.img) return null;
    const c = new ClusterPixel(ctx, ctx.img, size);
    if (ctx.asciiText.length > 0) c.setText(ctx.asciiText);
    return c;
  };

  /**
   * Construye el colonizador. Los atractores se muestrean con flockCellSize
   * (separación de los atractores), independiente del composeCellSize.
   */
  const makeColonizer = (): void => {
    if (!ctx.img) return;
    if (!colonizeBuffer) colonizeBuffer = p.createGraphics(W, H);
    const puntos = new ComposerPixel(ctx, ctx.img, flockCellSize);
    ctx.colonizer = new Colonizacion(
      ctx,
      puntos.datos,
      puntos.cellSize,
      ctx.colonizeThreshold,
      ctx.colonizeAttraction,
      ctx.colonizeKill,
      ctx.colonizeSeg,
      colonizeBuffer,
    );
  };

  /**
   * Reconstruye el cluster si el modo necesita un cellSize distinto: FLOCK usa
   * flockCellSize (menos agentes); el resto, cellSize. Solo reconstruye cuando
   * el tamaño difiere, así alternar modos del mismo tamaño conserva posiciones.
   */
  const ensureClusterForMode = (mode: Modo): void => {
    if (!ctx.img) return;
    const target = mode === "FLOCK" ? flockCellSize : cellSize;
    if (!ctx.cluster || ctx.cluster.cellSize !== target) {
      ctx.cluster = makeCluster(target);
    }
  };

  /**
   * Reconstruye el composer con el cellSize del modo de composición: HUESHIFT
   * usa el cellSize normal (mosaico fino); LINES/CIRCLES/RECTS usan
   * COMPOSE_CELL_SIZE. Los demás modos no lo usan.
   */
  const ensureComposerForMode = (mode: Modo): void => {
    if (!ctx.img) return;
    let target: number;
    if (mode === "HUESHIFT") target = cellSize;
    else if (mode === "LINES" || mode === "CIRCLES" || mode === "RECTS") {
      target = COMPOSE_CELL_SIZE;
    } else return;
    if (!ctx.composer || ctx.composer.cellSize !== target) {
      ctx.composer = new ComposerPixel(ctx, ctx.img, target);
    }
  };

  /** Limpia el canvas según el modo de fondo (define el efecto de estela). */
  const applyBackground = (): void => {
    switch (ctx.render.background) {
      case "CLEAR":
        p.background(0);
        break;
      case "TRAILS":
        p.noStroke();
        p.fill(0, ctx.render.trailFade);
        p.rect(0, 0, W, H);
        break;
      case "PERSIST":
        break; // no se limpia: estelas permanentes
    }
  };

  /** Dibuja, envejece y elimina los repulsores (explosiones) consumidos. */
  const updateRepulsors = (): void => {
    const rs = ctx.repulsors;
    for (let i = rs.length - 1; i >= 0; i--) {
      const r = rs[i];
      r.draw(p);
      r.age();
      if (r.dead()) rs.splice(i, 1);
    }
  };

  const play = (): void => {
    ctx.campo?.update(); // avanza la transición de flow field, si la hay
    applyBackground();
    if (ctx.state.showField) ctx.campo?.mostrarCampo();

    const animation = animaciones[ctx.state.mode];

    // enter() se ejecuta una sola vez, el primer frame del modo activo.
    if (ctx.state.mode !== lastMode) {
      ensureClusterForMode(ctx.state.mode);
      ensureComposerForMode(ctx.state.mode);
      animation.enter(ctx);
      lastMode = ctx.state.mode;
    }

    // Fuerzas de explosión: se acumulan ANTES de integrar, así se suman a la
    // fuerza del comportamiento activo en el mismo frame.
    ctx.cluster?.applyRepulsors(ctx.repulsors);

    // La mezcla aditiva hace que las partículas brillen al superponerse.
    if (ctx.render.additive) p.blendMode(p.ADD);
    animation.update(ctx);
    if (ctx.render.additive) p.blendMode(p.BLEND);

    updateRepulsors();
  };

  /**
   * Captura la imagen actual de la fuente y entra a modo partículas, o vuelve
   * a modo vista previa (flujo togglePhoto del original).
   */
  const togglePhoto = (): void => {
    if (ctx.state.cameraMode) {
      if (!fuente || !fuente.isReady()) return; // nada que capturar aún
      ctx.img = fuente.capture(); // copia el framebuffer (como captureCanvas)
      ctx.campo = new CampoFlujo(ctx, ctx.img, cellSize * 2);
      ctx.cluster = makeCluster(cellSize);
      ctx.composer = new ComposerPixel(ctx, ctx.img, COMPOSE_CELL_SIZE);
      fuente.stop(); // apaga la cámara mientras se anima
      ctx.state.cameraMode = false;
      lastMode = null;
      btnCaptura?.html("🎥 Cámara");
    } else {
      ctx.cluster?.reset();
      setMode("ORIGINAL");
      ctx.state.playing = false;
      ctx.state.cameraMode = true;
      lastMode = null;
      fuente?.start();
      btnCaptura?.html("📷 Capturar");
    }
  };

  /** Cambia a una ArchivoFuente con la imagen elegida (callback de carga). */
  const imagenSeleccionada = (img: p5.Image): void => {
    fuente?.stop();
    fuente = new ArchivoFuente(ctx, img);
    fuente.start();
    // Volver a modo vista previa con la nueva fuente.
    ctx.state.cameraMode = true;
    ctx.state.playing = false;
    ctx.cluster = null;
    ctx.campo = null;
    lastMode = null;
    btnCaptura?.html("📷 Capturar");
  };

  /** Abre el diálogo de archivo (reemplaza a selectInput, tecla `l`). */
  const cargarImagen = (): void => {
    if (!fileInput) {
      fileInput = p.createFileInput((file: p5.File) => {
        if (file.type === "image") {
          p.loadImage(file.data as string, (img) => imagenSeleccionada(img));
        }
      });
      fileInput.hide();
    }
    (fileInput.elt as HTMLInputElement).click();
  };

  /**
   * Botones táctiles (imprescindibles en móvil, útiles también en desktop):
   * llaman a los mismos comandos del ControlInteraccion que el teclado.
   */
  const crearBotones = (): void => {
    const estilo: Record<string, string> = {
      background: "rgba(10, 20, 13, 0.8)",
      color: "#00ff41",
      border: "1px solid #143b22",
      "font-family": "monospace",
      "font-size": "13px",
      padding: "6px 10px",
      cursor: "pointer",
    };
    const crear = (
      label: string,
      x: number,
      anchoPx: number,
      accion: () => void,
    ): p5.Element => {
      const b = p.createButton(label);
      b.position(x, H - 40);
      b.style("width", `${anchoPx}px`);
      b.style("white-space", "nowrap");
      b.style("overflow", "hidden");
      b.style("text-overflow", "ellipsis");
      for (const [k, v] of Object.entries(estilo)) b.style(k, v);
      b.mousePressed(accion);
      return b;
    };
    // Fila anclada a la DERECHA del canvas: la barra lateral fija de la
    // galería puede tapar la franja izquierda en pantallas medianas.
    const anchos = [110, 220, 85, 42, 50]; // capturar, modo, forma, 💥, ▶⏸
    const gap = 6;
    let x = W - 8 - (anchos.reduce((a, b) => a + b, 0) + gap * (anchos.length - 1));
    if (x < 4) x = 4; // en retrato (540) la fila arranca pegada al borde
    btnCaptura = crear("📷 Capturar", x, anchos[0], () => input.capturePhoto());
    x += anchos[0] + gap;
    btnModo = crear(`Modo ▸ ${MODOS[ctx.state.mode].label}`, x, anchos[1], () => {
      if (ctx.state.cameraMode) return;
      input.cycleMode();
    });
    x += anchos[1] + gap;
    crear("Forma ▸", x, anchos[2], () => input.changeShape());
    x += anchos[2] + gap;
    crear("💥", x, anchos[3], () => input.explosion());
    x += anchos[3] + gap;
    crear("▶⏸", x, anchos[4], () => input.play());
  };

  /** Aplica la config elegida en la pantalla inicial y arranca la fuente. */
  const alIniciar = (cfg: ConfigAtomos, conCamara: boolean): void => {
    ctx.config = cfg;
    ctx.asciiText = cfg.asciiText;
    cellSize = cellSizeEfectivo(cfg.cellSize, W, H, MAX_PARTICULAS);
    flockCellSize = cellSizeEfectivo(cfg.flockCellSize, W, H, MAX_FLOCK);
    configurando = false;
    crearBotones();
    if (conCamara) {
      const cam = new CamaraFuente(ctx, cfg.cameraId);
      fuente = cam;
      fuente.start();
    } else {
      fuente = null;
      cargarImagen(); // sin cámara: pedir una imagen de archivo de entrada
    }
  };

  /////////////////// CICLO DE VIDA p5 ///////////////////

  p.setup = () => {
    p.createCanvas(W, H);
    p.pixelDensity(1); // evita el 4x de fill-rate en pantallas retina

    animaciones = crearAnimaciones({ rebuildColonizer: makeColonizer });
    input = new ControlInteraccion(ctx, {
      setMode,
      togglePhoto,
      cargarImagen,
      rebuildColonizer: makeColonizer,
    });

    pantalla = new PantallaConfig(ctx, alIniciar);
    pantalla.construir();
  };

  p.draw = () => {
    if (configurando) {
      pantalla.dibujar();
      return;
    }
    if (ctx.state.cameraMode) {
      if (fuente) {
        fuente.draw();
      } else {
        p.background(0);
        p.fill(127, 255, 168);
        p.textFont("monospace");
        p.textSize(14);
        p.textAlign(p.CENTER, p.CENTER);
        p.text("carga una imagen con la tecla `l` o el diálogo", W / 2, H / 2);
      }
      // Recordatorio de captura sobre la vista previa.
      p.fill(0, 255, 65);
      p.textFont("monospace");
      p.textSize(13);
      p.textAlign(p.LEFT, p.TOP);
      p.text("t: capturar · l: cargar imagen · p: play", 10, 10);
    } else if (ctx.state.playing) {
      play();
    }
  };

  p.keyPressed = () => {
    // Durante la configuración (o escribiendo en un campo) el teclado es de la GUI.
    if (configurando) return true;
    const ae = typeof document !== "undefined" ? document.activeElement : null;
    if (
      ae &&
      (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT")
    ) {
      return true;
    }
    input.handleKey(p.key, p.keyCode);
    // Evita el scroll de la página con espacio y flechas (teclas usadas).
    if (p.keyCode === 32 || (p.keyCode >= 37 && p.keyCode <= 40)) return false;
    return true;
  };
};
