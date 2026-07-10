import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port ampliado de
 * `Talleres2021-CC1/.../Ejemplos/CC1_ejemplo3_mousePaint.js`.
 *
 * Herramienta de pintura por **capas**: todo el trazo acumulado (brochas y
 * figuras cerradas ya confirmadas) vive en un buffer offscreen persistente
 * (`capaPintura`, `p.createGraphics`) que nunca se limpia salvo que el usuario
 * cambie el color de fondo. Cada frame el `draw()` del canvas principal blitea
 * esa capa (`p.image(capaPintura, 0, 0)`) y encima dibuja SOLO lo transitorio:
 * la previsualización de la figura en construcción, el HUD indicador de modo y
 * el cursor de tamaño. Así se conserva la semántica "acumula" del original y a
 * la vez se puede previsualizar/indicar sin embarrar el lienzo.
 *
 * Brochas seleccionables por número (1–5), tamaño por `+`/`-` (o botones en
 * pantalla), color por selectores (`createColorPicker`) y un modo de figura
 * cerrada por vértices (`v` para alternar, `c` para cerrar). Sin audio.
 */

/**
 * Colores por defecto, identidad matrix/neon coherente con la galería. Se usan
 * como valor inicial de los selectores (fondo/brocha/borde/relleno) y para el
 * HUD/controles. El relleno de figura arranca igual que la brocha, por pedido.
 */
const PALETA = {
  fondo: "#050805", // negro matrix casi puro
  brocha: "#00ff41", // verde neón primario
  borde: "#ff8c1a", // naranja neón (acento del borde de figura)
  relleno: "#00ff41", // por defecto = color de brocha
  textoHud: "#7fffa8", // texto del HUD
  activoHud: "#00ff41", // resalte del estado activo
  acentoHud: "#ff8c1a", // acento (marcadores de vértice)
  panelHud: "rgba(10, 20, 13, 0.82)", // panel translúcido del HUD/barra
  panelSolido: "#0a140d", // fondo sólido de controles
  lineaHud: "#143b22", // bordes/divisores
};

/** Límites y paso del tamaño de brocha. */
const TAMANO_MIN = 2;
const TAMANO_MAX = 120;
const TAMANO_PASO = 2;

/** Límites y paso del ancho de trazo (stroke). */
const GROSOR_MIN = 1;
const GROSOR_MAX = 40;
const GROSOR_PASO = 1;

/** Alto reservado por la barra de controles (guarda anti-pintado). */
const ALTO_BARRA = 56;

type Selector = p5.Element & { color: () => p5.Color };
type ModoPintura = "pincel" | "figura";
type BrochaId = "cuadrado" | "circular" | "linea" | "aerografo" | "roseton";

export const mousePaint: SketchFactory = (p: p5) => {
  const W = 1000;
  const H = 1000;

  let capaPintura: p5.Graphics;
  let elementoCanvas: HTMLCanvasElement; // el <canvas> real, para corregir el mouse

  // Estado de herramienta.
  let modo: ModoPintura = "pincel";
  let brochaActiva: BrochaId = "cuadrado";
  let tamano = 24;
  let grosor = 2; // ancho de trazo (stroke) configurable por input
  let angBrocha = 0; // ángulo acumulado para brochas rotantes (cuadrado/rosetón)

  // Vértices de la figura en construcción (modo figura).
  const puntos: { x: number; y: number }[] = [];

  // Controles DOM.
  let selectorFondo: Selector;
  let selectorBrocha: Selector;
  let selectorBorde: Selector;
  let selectorRelleno: Selector;
  let lectorTamano: p5.Element;
  let lectorGrosor: p5.Element;

  // Nombres legibles de cada brocha para el HUD.
  const nombresBrocha: Record<BrochaId, string> = {
    cuadrado: "cuadrado",
    circular: "circular",
    linea: "línea",
    aerografo: "aerógrafo",
    roseton: "rosetón",
  };

  // Corrige el desfase mouse↔canvas cuando el wrapper escala el lienzo por CSS
  // transform: p5 divide por el tamaño de layout (sin escalar), no por el tamaño
  // visual, así que las coordenadas quedan desfasadas. Reconvertimos desde las
  // coordenadas de ventana usando el rect real (escalado) del canvas.
  function corregir(winX: number, winY: number) {
    const rect = elementoCanvas.getBoundingClientRect();
    const escalaX = rect.width / W || 1;
    const escalaY = rect.height / H || 1;
    return { x: (winX - rect.left) / escalaX, y: (winY - rect.top) / escalaY };
  }
  const posActual = () => corregir(p.winMouseX, p.winMouseY);
  const posPrevia = () => corregir(p.pwinMouseX, p.pwinMouseY);

  p.setup = () => {
    const lienzo = p.createCanvas(W, H);
    // Guardamos el <canvas> real para leer su rect al corregir el mouse.
    elementoCanvas = lienzo.elt as HTMLCanvasElement;

    // Capa persistente TRANSPARENTE: solo guarda el trazo (brochas y figuras).
    // El fondo NO se hornea aquí a propósito, para que cambiar su color no borre
    // lo ya pintado — se repinta cada frame detrás de la capa en draw().
    capaPintura = p.createGraphics(W, H);

    construirControles();
  };

  p.draw = () => {
    // Fondo NO destructivo: se repinta cada frame detrás de la capa, así
    // cambiar el color de fondo nunca borra el trazo acumulado.
    p.background(selectorFondo.color());
    // Blitea la pintura acumulada y encima solo lo transitorio.
    p.image(capaPintura, 0, 0);
    dibujarPreviewFigura();
    dibujarSilueta();
    dibujarHud();
  };

  // ── Brochas (una figura = una función; dibujan sobre la capa) ──────────────

  // Brush cuadrado: el rect rotante del original, ahora parametrizado.
  function brochaCuadrado(g: p5.Graphics, x: number, y: number, tam: number, col: p5.Color) {
    g.push();
    g.rectMode(p.CENTER);
    g.noStroke();
    g.fill(col);
    g.translate(x, y);
    g.rotate(angBrocha);
    g.rect(0, 0, tam, tam);
    g.pop();
    angBrocha += 0.15;
  }

  // Brush circular: elipse sólida.
  function brochaCircular(g: p5.Graphics, x: number, y: number, tam: number, col: p5.Color) {
    g.push();
    g.noStroke();
    g.fill(col);
    g.ellipse(x, y, tam, tam);
    g.pop();
  }

  // Brush línea: traza desde el punto anterior al actual mientras se arrastra.
  // El ancho usa el "grosor" (ancho de trazo) configurable con su input.
  function brochaLinea(
    g: p5.Graphics,
    x: number,
    y: number,
    xp: number,
    yp: number,
    col: p5.Color,
  ) {
    g.push();
    g.stroke(col);
    g.strokeCap(p.ROUND);
    g.strokeWeight(grosor);
    g.line(xp, yp, x, y);
    g.pop();
  }

  // Brush aerógrafo (compuesto): salpicado de puntos con jitter alrededor del
  // cursor; la densidad crece con el tamaño.
  function brochaAerografo(g: p5.Graphics, x: number, y: number, tam: number, col: p5.Color) {
    g.push();
    g.noStroke();
    g.fill(col);
    const radio = tam * 0.6;
    const cantidad = Math.floor(tam / 3) + 5;
    for (let i = 0; i < cantidad; i++) {
      const ang = p.random(p.TWO_PI);
      const r = p.random(radio);
      g.ellipse(x + Math.cos(ang) * r, y + Math.sin(ang) * r, p.random(1.5, 3.5));
    }
    g.pop();
  }

  // Brush rosetón (compuesto): varias copias de un pétalo rotadas alrededor del
  // punto, en el espíritu del cuadrado rotante original.
  function brochaRoseton(g: p5.Graphics, x: number, y: number, tam: number, col: p5.Color) {
    g.push();
    g.noStroke();
    g.fill(col);
    g.translate(x, y);
    g.rotate(angBrocha);
    const petalos = 6;
    const distancia = tam * 0.4;
    const largo = tam * 0.5;
    for (let i = 0; i < petalos; i++) {
      g.push();
      g.rotate((p.TWO_PI / petalos) * i);
      g.ellipse(0, distancia, largo * 0.6, largo);
      g.pop();
    }
    g.pop();
    angBrocha += 0.1;
  }

  // Dispatcher: aplica el brush activo sobre la capa. `xp/yp` es el punto
  // anterior (lo usa la brocha de línea para trazar el segmento).
  function aplicarBrocha(x: number, y: number, xp: number, yp: number) {
    const col = selectorBrocha.color();
    switch (brochaActiva) {
      case "cuadrado":
        brochaCuadrado(capaPintura, x, y, tamano, col);
        break;
      case "circular":
        brochaCircular(capaPintura, x, y, tamano, col);
        break;
      case "linea":
        brochaLinea(capaPintura, x, y, xp, yp, col);
        break;
      case "aerografo":
        brochaAerografo(capaPintura, x, y, tamano, col);
        break;
      case "roseton":
        brochaRoseton(capaPintura, x, y, tamano, col);
        break;
    }
  }

  // ── Modo figura: construir y cerrar polígono ───────────────────────────────

  // Confirma la figura sobre la capa (stroke=borde, fill=relleno) y limpia los
  // puntos.
  function cerrarFigura() {
    if (puntos.length < 3) {
      puntos.length = 0;
      return;
    }
    const g = capaPintura;
    g.push();
    g.stroke(selectorBorde.color());
    g.strokeWeight(grosor);
    g.fill(selectorRelleno.color());
    g.beginShape();
    for (const pt of puntos) g.vertex(pt.x, pt.y);
    g.endShape(p.CLOSE);
    g.pop();
    puntos.length = 0;
  }

  // ── Overlay transitorio (se redibuja cada frame, no embarra) ───────────────

  // Previsualización del modo figura: la polilínea, los vértices ya colocados, y
  // un marcador en la posición actual del mouse (dónde caerá el próximo vértice).
  function dibujarPreviewFigura() {
    if (modo !== "figura") return;
    const { x, y } = posActual();
    const dentro = !fueraDeLienzo() && !sobreBarra();

    p.push();
    if (puntos.length > 0) {
      p.noFill();
      p.stroke(PALETA.activoHud);
      p.strokeWeight(1.5);
      p.beginShape();
      for (const pt of puntos) p.vertex(pt.x, pt.y);
      // Segmento fantasma desde el último vértice hasta el cursor.
      if (dentro) p.vertex(x, y);
      p.endShape();
      p.noStroke();
      p.fill(PALETA.acentoHud);
      for (const pt of puntos) p.ellipse(pt.x, pt.y, 7);
    }
    // Marcador del vértice a colocar en la posición actual (anillo + punto).
    if (dentro) {
      p.noFill();
      p.stroke(PALETA.acentoHud);
      p.strokeWeight(1.5);
      p.ellipse(x, y, 12);
      p.noStroke();
      p.fill(PALETA.acentoHud);
      p.ellipse(x, y, 4);
    }
    p.pop();
  }

  // Silueta de la brocha activa bajo el cursor (solo en modo pincel), con el
  // color actual de la brocha, para previsualizar qué y dónde se va a pintar.
  function dibujarSilueta() {
    if (modo !== "pincel" || sobreBarra() || fueraDeLienzo()) return;
    const { x, y } = posActual();
    const col = selectorBrocha.color();
    p.push();
    p.noFill();
    p.stroke(col);
    p.strokeWeight(1);
    switch (brochaActiva) {
      case "cuadrado":
        p.push();
        p.rectMode(p.CENTER);
        p.translate(x, y);
        p.rotate(angBrocha);
        p.rect(0, 0, tamano, tamano);
        p.pop();
        break;
      case "circular":
        p.ellipse(x, y, tamano, tamano);
        break;
      case "linea":
        // Muestra un segmento con el ancho de trazo actual.
        p.strokeWeight(grosor);
        p.strokeCap(p.ROUND);
        p.line(x - tamano / 2, y, x + tamano / 2, y);
        break;
      case "aerografo":
        // Círculo del radio del salpicado (tam * 0.6).
        p.ellipse(x, y, tamano * 1.2, tamano * 1.2);
        break;
      case "roseton": {
        p.push();
        p.translate(x, y);
        p.rotate(angBrocha);
        const petalos = 6;
        const distancia = tamano * 0.4;
        const largo = tamano * 0.5;
        for (let i = 0; i < petalos; i++) {
          p.push();
          p.rotate((p.TWO_PI / petalos) * i);
          p.ellipse(0, distancia, largo * 0.6, largo);
          p.pop();
        }
        p.pop();
        break;
      }
    }
    p.pop();
  }

  // HUD con modo/brocha/tamaño; resalta el estado activo.
  function dibujarHud() {
    const x = 10;
    const h = 72;
    const y = H - h - 10;
    const w = 168;
    p.push();
    p.noStroke();
    p.fill(PALETA.panelHud);
    p.rect(x, y, w, h, 6);
    p.noFill();
    p.stroke(PALETA.lineaHud);
    p.rect(x, y, w, h, 6);
    p.noStroke();
    p.textSize(11);
    p.textAlign(p.LEFT, p.BASELINE);
    p.fill(modo === "pincel" ? PALETA.activoHud : PALETA.acentoHud);
    p.text(`Modo: ${modo === "pincel" ? "Pincel" : "Figura (c: cerrar)"}`, x + 8, y + 18);
    p.fill(PALETA.textoHud);
    p.text(`Brocha: ${nombresBrocha[brochaActiva]}`, x + 8, y + 34);
    p.text(`Tamaño: ${tamano}`, x + 8, y + 50);
    p.text(`Trazo: ${grosor}`, x + 8, y + 66);
    p.pop();
  }

  // ── Utilidades de guarda de pintado ────────────────────────────────────────

  function fueraDeLienzo(): boolean {
    const { x, y } = posActual();
    return x < 0 || x > W || y < 0 || y > H;
  }

  // La barra de controles ocupa el strip superior; no se pinta debajo de ella.
  function sobreBarra(): boolean {
    const { y } = posActual();
    return y >= 0 && y < ALTO_BARRA;
  }

  // ── Interacción de mouse ───────────────────────────────────────────────────

  p.mousePressed = () => {
    if (fueraDeLienzo() || sobreBarra()) return;
    const { x, y } = posActual();
    if (modo === "figura") {
      puntos.push({ x, y });
      return;
    }
    aplicarBrocha(x, y, x, y);
  };

  p.mouseDragged = () => {
    if (fueraDeLienzo() || sobreBarra()) return;
    if (modo === "figura") return; // los vértices se colocan por click, no arrastrando
    const { x, y } = posActual();
    const prev = posPrevia();
    aplicarBrocha(x, y, prev.x, prev.y);
  };

  // ── Teclado ────────────────────────────────────────────────────────────────

  const teclasBrocha: Record<string, BrochaId> = {
    "1": "cuadrado",
    "2": "circular",
    "3": "linea",
    "4": "aerografo",
    "5": "roseton",
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") {
      p.saveCanvas("mouse-paint", "png");
      return;
    }
    // Seleccionar brocha también pone el modo en "pincel".
    const brocha = teclasBrocha[p.key];
    if (brocha) {
      brochaActiva = brocha;
      modo = "pincel";
      return;
    }
    if (p.key === "+" || p.key === "=") {
      cambiarTamano(TAMANO_PASO);
      return;
    }
    if (p.key === "-" || p.key === "_") {
      cambiarTamano(-TAMANO_PASO);
      return;
    }
    if (p.key === "v" || p.key === "V") {
      modo = modo === "figura" ? "pincel" : "figura";
      return;
    }
    if (p.key === "c" || p.key === "C") {
      if (modo === "figura") cerrarFigura();
      return;
    }
  };

  // ── Tamaño ─────────────────────────────────────────────────────────────────

  function cambiarTamano(delta: number) {
    tamano = p.constrain(tamano + delta, TAMANO_MIN, TAMANO_MAX);
    lectorTamano?.html(String(tamano));
  }

  function cambiarGrosor(delta: number) {
    grosor = p.constrain(grosor + delta, GROSOR_MIN, GROSOR_MAX);
    lectorGrosor?.html(String(grosor));
  }

  // ── Construcción de la barra de controles (estilo matrix) ──────────────────

  function construirControles() {
    const barra = p.createDiv("");
    barra.position(0, 0);
    barra.style("box-sizing", "border-box");
    barra.style("width", `${W}px`);
    barra.style("display", "flex");
    barra.style("align-items", "center");
    barra.style("gap", "10px");
    barra.style("flex-wrap", "wrap");
    barra.style("padding", "6px 8px");
    barra.style("background", PALETA.panelHud);
    barra.style("border-bottom", `1px solid ${PALETA.lineaHud}`);
    barra.style("font-family", "'Share Tech Mono', monospace");
    barra.style("font-size", "10px");
    barra.style("color", PALETA.textoHud);

    // Selectores de color, cada uno con su etiqueta. El fondo se lee cada frame
    // en draw() (no se hornea en la capa), por eso no necesita handler:
    // cambiarlo es no destructivo.
    selectorFondo = crearSelector(barra, "Fondo", PALETA.fondo);

    selectorBrocha = crearSelector(barra, "Brocha", PALETA.brocha);
    selectorBorde = crearSelector(barra, "Borde", PALETA.borde);
    selectorRelleno = crearSelector(barra, "Relleno", PALETA.relleno);

    // Control de tamaño: − [valor] +
    const grupoTam = crearGrupo(barra, "Tamaño");
    const fila = p.createDiv("");
    fila.parent(grupoTam);
    fila.style("display", "flex");
    fila.style("align-items", "center");
    fila.style("gap", "4px");

    const botonMenos = p.createButton("−");
    botonMenos.parent(fila);
    estilizarBoton(botonMenos);
    botonMenos.mousePressed(() => cambiarTamano(-TAMANO_PASO));

    lectorTamano = p.createDiv(String(tamano));
    lectorTamano.parent(fila);
    lectorTamano.style("min-width", "22px");
    lectorTamano.style("text-align", "center");
    lectorTamano.style("color", PALETA.activoHud);

    const botonMas = p.createButton("+");
    botonMas.parent(fila);
    estilizarBoton(botonMas);
    botonMas.mousePressed(() => cambiarTamano(TAMANO_PASO));

    // Control de ancho de trazo (stroke): − [valor] +
    const grupoTrazo = crearGrupo(barra, "Trazo");
    const filaTrazo = p.createDiv("");
    filaTrazo.parent(grupoTrazo);
    filaTrazo.style("display", "flex");
    filaTrazo.style("align-items", "center");
    filaTrazo.style("gap", "4px");

    const trazoMenos = p.createButton("−");
    trazoMenos.parent(filaTrazo);
    estilizarBoton(trazoMenos);
    trazoMenos.mousePressed(() => cambiarGrosor(-GROSOR_PASO));

    lectorGrosor = p.createDiv(String(grosor));
    lectorGrosor.parent(filaTrazo);
    lectorGrosor.style("min-width", "22px");
    lectorGrosor.style("text-align", "center");
    lectorGrosor.style("color", PALETA.activoHud);

    const trazoMas = p.createButton("+");
    trazoMas.parent(filaTrazo);
    estilizarBoton(trazoMas);
    trazoMas.mousePressed(() => cambiarGrosor(GROSOR_PASO));
  }

  // Contenedor en columna con una etiqueta arriba.
  function crearGrupo(padre: p5.Element, titulo: string): p5.Element {
    const grupo = p.createDiv("");
    grupo.parent(padre);
    grupo.style("display", "flex");
    grupo.style("flex-direction", "column");
    grupo.style("align-items", "center");
    grupo.style("gap", "2px");
    const etiqueta = p.createDiv(titulo);
    etiqueta.parent(grupo);
    etiqueta.style("font-size", "9px");
    etiqueta.style("opacity", "0.8");
    return grupo;
  }

  // Selector de color etiquetado y estilizado a la paleta.
  function crearSelector(padre: p5.Element, titulo: string, valor: string): Selector {
    const grupo = crearGrupo(padre, titulo);
    const selector = p.createColorPicker(valor) as Selector;
    selector.parent(grupo);
    selector.style("width", "34px");
    selector.style("height", "24px");
    selector.style("padding", "0");
    selector.style("border", `1px solid ${PALETA.lineaHud}`);
    selector.style("background", PALETA.panelSolido);
    selector.style("cursor", "pointer");
    return selector;
  }

  function estilizarBoton(boton: p5.Element) {
    boton.style("font-family", "inherit");
    boton.style("font-size", "13px");
    boton.style("width", "24px");
    boton.style("height", "24px");
    boton.style("line-height", "1");
    boton.style("color", PALETA.brocha);
    boton.style("background", PALETA.panelSolido);
    boton.style("border", `1px solid ${PALETA.lineaHud}`);
    boton.style("border-radius", "4px");
    boton.style("cursor", "pointer");
    boton.style("touch-action", "manipulation");
  }
};
