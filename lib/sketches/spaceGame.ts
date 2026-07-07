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
 */
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
  let score = 0;
  let scoreFinal = 0;
  let ultimoSpawn = 0;

  const reiniciar = () => {
    jugador = new Jugador(p, ANCHO / 2, ALTO / 2, 10, "white");
    proyectiles = [];
    enemigos = [];
    particulas = [];
    score = 0;
    ultimoSpawn = p.millis();
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
    const color = `hsl(${p.random(360)}, 50%, 50%)`;
    const angle = Math.atan2(jugador.y - y, jugador.x - x);
    const velocidad = p.createVector(Math.cos(angle), Math.sin(angle));
    enemigos.push(new Enemigo(p, x, y, radio, color, velocidad));
  };

  const disparar = () => {
    const angle = Math.atan2(p.mouseY - jugador.y, p.mouseX - jugador.x);
    const velocidad = p.createVector(
      Math.cos(angle) * PROYECTIL_VEL,
      Math.sin(angle) * PROYECTIL_VEL,
    );
    proyectiles.push(
      new Proyectil(p, jugador.x, jugador.y, 5, "white", velocidad),
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
    p.background(0, 0, 0, 18); // estela (motion blur)
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
    p.fill(255);
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(20);
    p.text(`Score: ${score}`, 16, 16);
  };

  const dibujarTexto = (lineas: { txt: string; size: number; dy: number }[]) => {
    p.noStroke();
    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    for (const l of lineas) {
      p.textSize(l.size);
      p.text(l.txt, ANCHO / 2, ALTO / 2 + l.dy);
    }
  };

  const dibujarInicio = () => {
    p.background(0);
    dibujarTexto([
      { txt: "Space Game", size: 48, dy: -40 },
      { txt: "Clic para empezar", size: 22, dy: 30 },
    ]);
  };

  const dibujarGameOver = () => {
    // Capa semitransparente sobre la última escena.
    p.noStroke();
    p.fill(0, 0, 0, 180);
    p.rect(0, 0, ANCHO, ALTO);
    dibujarTexto([
      { txt: "Game Over", size: 48, dy: -50 },
      { txt: `Puntos: ${scoreFinal}`, size: 26, dy: 10 },
      { txt: "Clic para reiniciar", size: 20, dy: 60 },
    ]);
  };

  p.setup = () => {
    p.createCanvas(ANCHO, ALTO);
    p.background(0);
    p.textFont("Arial");
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

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("space-game", "png");
  };
};
