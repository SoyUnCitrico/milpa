import type p5 from "p5";
import type { SketchFactory } from "../types";
import {
  Jugador,
  Proyectil,
  Enemigo,
  ParticulaExplosion,
} from "../bibliotecas/juegoEspacial";

/**
 * Reimplementación en p5 (modo instancia) del juego `spaceGame/sketch.js`, que
 * en el original es Canvas 2D vanilla + gsap + DOM.
 *
 * Cambios principales respecto al original (ver translations/translation_spaceGame.md):
 *  - `requestAnimationFrame` → loop `p.draw`; `setInterval` de spawn → timer con
 *    `p.millis()`; `setTimeout(...,0)` para splice → iteración hacia atrás.
 *  - `gsap.to(enemy,{radio})` → tween manual (`Enemigo.encoger` + `lerp`).
 *  - DOM (score, modal, botón Start) → HUD y pantallas dibujadas en el canvas y
 *    una máquina de estados (`inicio` | `jugando` | `gameover`).
 *  - Lienzo fijo 800×600 (el original era pantalla completa).
 *
 * Revisión de unificación (ver `algorithms.md`):
 *  - Jugador pasó de círculo fijo en el centro a nave triangular móvil
 *    (WASD, `p.keyIsDown` continuo dentro de `actualizarJuego`) que siempre
 *    apunta hacia el cursor; el ángulo se calcula una sola vez dentro de
 *    `Jugador.actualizarAngulo()` y lo reutilizan tanto el dibujo de la nave
 *    como `disparar()`.
 *  - `TECLA_ABAJO` (movimiento WASD, vía `keyIsDown`) y `s`/`S` (guardar
 *    canvas, vía `keyPressed`) comparten la misma tecla física, pero son
 *    mecanismos distintos: no chocan en el estado que actualizan. Sí existe
 *    un roce real de UX si se mantiene la tecla presionada — el auto-repeat
 *    del navegador dispararía `keyPressed` (y por lo tanto `saveCanvas`)
 *    varias veces mientras se mueve la nave hacia abajo — resuelto con un
 *    guard `event.repeat` en `keyPressed` (ver más abajo).
 *  - Colores de enemigo: antes `hsl(random(360), 50%, 50%)` (matiz
 *    arbitrario de todo el espectro); ahora se elige de `PALETA.enemigos`
 *    según el tier de tamaño del enemigo al spawnear (más grande = más
 *    resistente a los impactos = tonos más "calientes").
 *  - Campo de estrellas fijo (generado una vez en `setup`) redibujado cada
 *    frame por encima del fondo para que sea visible en los tres estados sin
 *    que la estela (motion blur de `actualizarJuego`) lo borre con el tiempo.
 */

/** Paleta del sketch — ajustar aquí sin tocar la lógica de dibujo/juego. */
const PALETA = {
  fondo: "#03040a", // negro azulado profundo del espacio (antes background(0,0,0,18) sin variable propia)
  estrella: "#bfe8ff", // blanco-cian pálido de las estrellas de fondo
  nave: "#39ff9e", // verde-cian neón de la nave del jugador (antes círculo blanco liso)
  proyectil: "#eafcff", // blanco-cian de los disparos (antes "white" literal)
  hud: "#d8fff0", // texto de score y pantallas (antes fill(255) genérico)
  overlay: "#000000", // velo oscuro de la pantalla de game over
  // Colores de enemigo por tier de tamaño (antes hsl(random(360),...) sin control).
  // Enemigos más grandes aguantan más impactos (ver `encoger()`), así que se
  // les asignan tonos más "calientes" para sugerir mayor peligro/resistencia.
  enemigos: {
    frios: ["#00e5ff", "#b026ff"], // chicos (radio < 13): cian eléctrico, violeta neón
    medios: ["#ff2bd6", "#aeff00"], // medianos (13–22): magenta, lima ácido
    calientes: ["#ffb000", "#ff3131"], // grandes (>=22): ámbar, rojo alerta
  },
};

/** Configuración numérica del jugador — velocidad y radio de colisión/nave. */
const CONFIG_JUGADOR = {
  radio: 10,
  velocidad: 4, // px/frame por eje al mover con WASD (diagonales normalizadas)
};

/** Configuración numérica del campo de estrellas de fondo. */
const CONFIG_ESTRELLAS = {
  cantidad: 60, // unas pocas decenas bastan para el efecto en un canvas de 800×600
  radioMin: 0.6,
  radioMax: 1.8,
  velocidadParpadeoMin: 0.4,
  velocidadParpadeoMax: 1.6,
};

/** Opacidades usadas en los fondos (antes literales sueltos en cada `background`/`fill`). */
const CONFIG_JUEGO = {
  alphaEstela: 18, // opacidad del rastro (motion blur) del fondo mientras se juega
  alphaOverlay: 180, // opacidad del velo oscuro sobre la pantalla de game over
};

// Teclas de movimiento (keyCodes para `p.keyIsDown`, revisadas cada frame en
// `actualizarJuego` — mecanismo independiente de `p.keyPressed`). `TECLA_ABAJO`
// comparte tecla física con el atajo de guardar canvas (`s`/`S`); ver el
// guard de auto-repeat en `p.keyPressed` más abajo.
const TECLA_ARRIBA = 87; // W
const TECLA_IZQUIERDA = 65; // A
const TECLA_ABAJO = 83; // S
const TECLA_DERECHA = 68; // D

type Estrella = {
  x: number;
  y: number;
  radio: number;
  fase: number;
  velocidadParpadeo: number;
};

export const spaceGame: SketchFactory = (p: p5) => {
  const ANCHO = 800;
  const ALTO = 600;
  const PROYECTIL_VEL = 8;
  const INTERVALO_SPAWN = 1000; // ms

  type Estado = "inicio" | "jugando" | "gameover";
  let estado: Estado = "inicio";

  let jugador: Jugador;
  let proyectiles: Proyectil[] = [];
  let enemigos: Enemigo[] = [];
  let particulas: ParticulaExplosion[] = [];
  let estrellas: Estrella[] = [];
  let score = 0;
  let scoreFinal = 0;
  let ultimoSpawn = 0;

  // Componentes RGB de fondo/estrella, derivados una sola vez en `setup` para
  // reutilizarlos en `fill`/`background` sin instanciar un `p5.Color` por
  // llamada (mismo patrón que `spiralGira.ts`).
  let fondoR = 0,
    fondoG = 0,
    fondoB = 0;
  let estrellaR = 255,
    estrellaG = 255,
    estrellaB = 255;
  let overlayR = 0,
    overlayG = 0,
    overlayB = 0;

  const reiniciar = () => {
    jugador = new Jugador(p, ANCHO / 2, ALTO / 2, CONFIG_JUGADOR.radio, PALETA.nave);
    proyectiles = [];
    enemigos = [];
    particulas = [];
    score = 0;
    ultimoSpawn = p.millis();
  };

  const crearEstrellas = () => {
    estrellas = [];
    for (let i = 0; i < CONFIG_ESTRELLAS.cantidad; i++) {
      estrellas.push({
        x: p.random(ANCHO),
        y: p.random(ALTO),
        radio: p.random(CONFIG_ESTRELLAS.radioMin, CONFIG_ESTRELLAS.radioMax),
        fase: p.random(p.TWO_PI),
        velocidadParpadeo: p.random(
          CONFIG_ESTRELLAS.velocidadParpadeoMin,
          CONFIG_ESTRELLAS.velocidadParpadeoMax,
        ),
      });
    }
  };

  // Redibuja el campo de estrellas encima del fondo cada frame (no depende de
  // que persistan solas en el buffer, así la estela de `actualizarJuego` no
  // las borra con el tiempo). Visible en los tres estados del juego.
  const dibujarEstrellas = () => {
    p.noStroke();
    const t = p.millis() / 1000;
    for (const estrella of estrellas) {
      const brillo = p.map(
        Math.sin(t * estrella.velocidadParpadeo + estrella.fase),
        -1,
        1,
        90,
        255,
      );
      p.fill(estrellaR, estrellaG, estrellaB, brillo);
      p.circle(estrella.x, estrella.y, estrella.radio * 2);
    }
  };

  /** Elige un color de `PALETA.enemigos` según el tier de tamaño del enemigo. */
  const colorEnemigoPorRadio = (radio: number): string => {
    if (radio < 13) return p.random(PALETA.enemigos.frios) as string;
    if (radio < 22) return p.random(PALETA.enemigos.medios) as string;
    return p.random(PALETA.enemigos.calientes) as string;
  };

  const crearEnemigo = () => {
    const radio = p.random(5, 30);
    let x: number;
    let y: number;
    if (p.random() < 0.5) {
      x = p.random() < 0.5 ? 0 - radio : ANCHO + radio;
      y = p.random(ALTO);
    } else {
      x = p.random(ANCHO);
      y = p.random() < 0.5 ? 0 - radio : ALTO + radio;
    }
    const color = colorEnemigoPorRadio(radio);
    const angle = Math.atan2(jugador.y - y, jugador.x - x);
    const velocidad = p.createVector(Math.cos(angle), Math.sin(angle));
    enemigos.push(new Enemigo(p, x, y, radio, color, velocidad));
  };

  // Movimiento continuo WASD: se revisa cada frame dentro de `actualizarJuego`
  // (no en `keyPressed`) para que mantener la tecla mueva a la nave sin cortes.
  const moverJugador = () => {
    let dx = 0;
    let dy = 0;
    if (p.keyIsDown(TECLA_ARRIBA)) dy -= 1;
    if (p.keyIsDown(TECLA_ABAJO)) dy += 1;
    if (p.keyIsDown(TECLA_IZQUIERDA)) dx -= 1;
    if (p.keyIsDown(TECLA_DERECHA)) dx += 1;

    if (dx !== 0 && dy !== 0) {
      // Normaliza la diagonal para no moverse más rápido al combinar teclas.
      const inv = Math.SQRT1_2;
      dx *= inv;
      dy *= inv;
    }

    jugador.x = p.constrain(
      jugador.x + dx * CONFIG_JUGADOR.velocidad,
      jugador.radio,
      ANCHO - jugador.radio,
    );
    jugador.y = p.constrain(
      jugador.y + dy * CONFIG_JUGADOR.velocidad,
      jugador.radio,
      ALTO - jugador.radio,
    );
  };

  const disparar = () => {
    // Reutiliza el ángulo ya calculado por `Jugador.actualizarAngulo()` — no
    // se duplica el `atan2` hacia el mouse en un segundo lugar.
    const angle = jugador.angulo;
    const velocidad = p.createVector(
      Math.cos(angle) * PROYECTIL_VEL,
      Math.sin(angle) * PROYECTIL_VEL,
    );
    proyectiles.push(
      new Proyectil(p, jugador.x, jugador.y, 5, PALETA.proyectil, velocidad),
    );
  };

  const explotar = (x: number, y: number, color: string, cantidad: number) => {
    for (let i = 0; i < cantidad; i++) {
      const velocidad = p.createVector(
        (p.random() - 0.5) * (p.random() * 6),
        (p.random() - 0.5) * (p.random() * 6),
      );
      particulas.push(new ParticulaExplosion(p, x, y, 3, color, velocidad));
    }
  };

  const fueraDePantalla = (proy: Proyectil) =>
    proy.x + proy.radio < 0 ||
    proy.x - proy.radio > ANCHO ||
    proy.y + proy.radio < 0 ||
    proy.y - proy.radio > ALTO;

  // Bucle de juego: actualiza/dibuja entidades y resuelve colisiones.
  const actualizarJuego = () => {
    p.background(fondoR, fondoG, fondoB, CONFIG_JUEGO.alphaEstela); // estela (motion blur)
    dibujarEstrellas();

    moverJugador();
    jugador.actualizarAngulo();
    jugador.dibujar();

    // Spawn de enemigos por tiempo (reemplaza setInterval).
    if (p.millis() - ultimoSpawn > INTERVALO_SPAWN) {
      crearEnemigo();
      ultimoSpawn = p.millis();
    }

    // Proyectiles (hacia atrás para poder eliminar sin saltarse índices).
    for (let i = proyectiles.length - 1; i >= 0; i--) {
      proyectiles[i].actualizar();
      if (fueraDePantalla(proyectiles[i])) proyectiles.splice(i, 1);
    }

    // Enemigos + colisiones.
    for (let i = enemigos.length - 1; i >= 0; i--) {
      const enemigo = enemigos[i];
      enemigo.actualizar();

      // Colisión enemigo-jugador → game over.
      if (
        p.dist(jugador.x, jugador.y, enemigo.x, enemigo.y) -
          enemigo.radio -
          jugador.radio <
        0
      ) {
        scoreFinal = score;
        estado = "gameover";
        return;
      }

      // Colisión enemigo-proyectil.
      for (let j = proyectiles.length - 1; j >= 0; j--) {
        const proyectil = proyectiles[j];
        const choque =
          p.dist(proyectil.x, proyectil.y, enemigo.x, enemigo.y) -
            enemigo.radio -
            proyectil.radio <
          0;
        if (!choque) continue;

        if (enemigo.radio - 10 > 10) {
          enemigo.encoger(10);
          proyectiles.splice(j, 1);
          score += 50;
        } else {
          score += 150;
          explotar(proyectil.x, proyectil.y, enemigo.color, enemigo.radio + 2);
          enemigos.splice(i, 1);
          proyectiles.splice(j, 1);
          break; // este enemigo ya no existe
        }
      }
    }

    // Partículas de explosión.
    for (let i = particulas.length - 1; i >= 0; i--) {
      if (particulas[i].terminada()) {
        particulas.splice(i, 1);
      } else {
        particulas[i].actualizar();
      }
    }

    dibujarHud();
  };

  const dibujarHud = () => {
    p.noStroke();
    p.fill(PALETA.hud);
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(20);
    p.text(`Score: ${score}`, 16, 16);
  };

  const dibujarTexto = (lineas: { txt: string; size: number; dy: number }[]) => {
    p.noStroke();
    p.fill(PALETA.hud);
    p.textAlign(p.CENTER, p.CENTER);
    for (const l of lineas) {
      p.textSize(l.size);
      p.text(l.txt, ANCHO / 2, ALTO / 2 + l.dy);
    }
  };

  // Pantallas de inicio/game-over: fondo sólido + estrellas redibujadas encima
  // (en vez de depender del buffer previo) para que el campo estelar se vea
  // consistente en los tres estados del juego.
  const dibujarInicio = () => {
    p.background(PALETA.fondo);
    dibujarEstrellas();
    dibujarTexto([
      { txt: "Space Game", size: 48, dy: -40 },
      { txt: "Clic para empezar", size: 22, dy: 30 },
    ]);
  };

  const dibujarGameOver = () => {
    p.background(PALETA.fondo);
    dibujarEstrellas();
    // Velo oscuro extra para la legibilidad del texto.
    p.noStroke();
    p.fill(overlayR, overlayG, overlayB, CONFIG_JUEGO.alphaOverlay);
    p.rect(0, 0, ANCHO, ALTO);
    dibujarTexto([
      { txt: "Game Over", size: 48, dy: -50 },
      { txt: `Puntos: ${scoreFinal}`, size: 26, dy: 10 },
      { txt: "Clic para reiniciar", size: 20, dy: 60 },
    ]);
  };

  p.setup = () => {
    p.createCanvas(ANCHO, ALTO);

    const fondoColor = p.color(PALETA.fondo);
    fondoR = p.red(fondoColor);
    fondoG = p.green(fondoColor);
    fondoB = p.blue(fondoColor);
    const estrellaColor = p.color(PALETA.estrella);
    estrellaR = p.red(estrellaColor);
    estrellaG = p.green(estrellaColor);
    estrellaB = p.blue(estrellaColor);
    const overlayColor = p.color(PALETA.overlay);
    overlayR = p.red(overlayColor);
    overlayG = p.green(overlayColor);
    overlayB = p.blue(overlayColor);

    p.background(PALETA.fondo);
    p.textFont("Arial");
    crearEstrellas();
  };

  p.draw = () => {
    if (estado === "jugando") {
      actualizarJuego();
    } else if (estado === "inicio") {
      dibujarInicio();
    } else {
      dibujarGameOver();
    }
  };

  p.mousePressed = () => {
    // Ignora clics fuera del lienzo (p. ej. sobre la UI de la galería).
    if (
      p.mouseX < 0 ||
      p.mouseX > ANCHO ||
      p.mouseY < 0 ||
      p.mouseY > ALTO
    ) {
      return;
    }

    if (estado === "jugando") {
      disparar();
    } else {
      reiniciar();
      estado = "jugando";
    }
  };

  p.keyPressed = (event?: object) => {
    // `s`/`S` es también el keyCode de "abajo" en WASD (`TECLA_ABAJO`, leído
    // por separado vía `p.keyIsDown` en `moverJugador`). Sin este guard, el
    // auto-repeat del navegador al mantener la tecla presionada dispararía
    // `saveCanvas` (una descarga de PNG) muchas veces mientras se mueve la
    // nave hacia abajo. `event.repeat` distingue el keydown inicial (guarda)
    // de los repetidos por mantener la tecla (no guarda), sin afectar el
    // movimiento continuo que ya se lee por `keyIsDown`.
    const esRepeticion = (event as KeyboardEvent | undefined)?.repeat === true;
    if ((p.key === "g" || p.key === "G") && !esRepeticion) {
      p.saveCanvas("space-game", "png");
    }
  };
};
