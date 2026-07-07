# translation_spaceGame.md

Notas de migración de **`spaceGame`** a la galería `MILPA`. A diferencia de los
otros ports, **no es una conversión mecánica global→instancia**: el original es un
juego en **Canvas 2D vanilla + gsap + DOM**, así que se **reimplementó el mismo
juego sobre la API de p5** (modo instancia). Owner de GitHub: `SoyUnCitrico`
(default; no hizo falta tocar `config.ts` ni el fallback de UI).

## Archivos

- `lib/bibliotecas/juegoEspacial/` — módulo dedicado con las entidades del juego
  (decisión: módulo separado, no reusar `particula.ts`):
  - `jugador.ts` (`Jugador`), `proyectil.ts` (`Proyectil`), `enemigo.ts` (`Enemigo`),
    `particulaExplosion.ts` (`ParticulaExplosion`), `index.ts` (barrel).
- `lib/sketches/spaceGame.ts` — factory que orquesta el bucle, la máquina de
  estados, el spawn, las colisiones y el HUD.
- Registrado en `lib/sketches/index.ts` (slug `space-game`).
- Original vendorizado en `originals/spaceGame/sketch.js` (`npm run gen:originals`,
  18/18 sources).

## Cambios más importantes del port

| Original (Canvas 2D vanilla) | Port p5 (instancia) |
|---|---|
| `canvas.getContext("2d")` + `arc/fill` | `p.circle` + `p.fill`/`p.noStroke` |
| `drawBackground("rgba(0,0,0,0.07)")` (estela) | `p.background(0, 0, 0, 18)` por frame |
| `requestAnimationFrame(animate)` | loop `p.draw` |
| `setInterval(..., 1000)` para spawn | timer con `p.millis()` (`ultimoSpawn`/`INTERVALO_SPAWN`) |
| `setTimeout(...,0)` para splice seguro | iteración **hacia atrás** sobre los arreglos |
| `gsap.to(enemy,{radio})` | tween manual `Enemigo.encoger` + `p.lerp(radio, radioObjetivo, 0.2)` |
| DOM: `#scoreElt`, `.modal`, botón Start | HUD y pantallas (`inicio`/`gameover`) dibujadas en el canvas con `p.text` |
| click en `window` / botón Start | `p.mousePressed` (dispara o inicia/reinicia según estado) |
| `hsl(h,50%,50%)` + `globalAlpha`/`save`/`restore` | `p.color('hsl(...)')` + `c.setAlpha(alpha*255)` para el fade |
| `innerWidth × innerHeight` (fullscreen) | lienzo lógico fijo **800×600**, jugador en el centro |

**Máquina de estados** (reemplaza el modal DOM): `"inicio" | "jugando" |
"gameover"`. `mousePressed` inicia/reinicia cuando no se está jugando, o dispara
cuando sí. Se añadió una guarda de límites para ignorar clics fuera del lienzo
(sobre la UI de la galería).

## Código más relevante encontrado

- Las cuatro entidades son pequeñas y casi idénticas en estructura (`x,y,radio,
  color,velocidad` + `dibujar`/`actualizar`); el valor está en el **bucle de
  colisiones** (`actualizarJuego`): distancia con `p.dist`, enemigo grande →
  encoge (+50), enemigo chico → explosión de partículas (+150) y se elimina,
  enemigo-jugador → game over.
- El patrón "spawn desde un borde apuntando al jugador" (`atan2` + vector unitario)
  y la "explosión de N partículas con fricción y fade" son los algoritmos
  reutilizables si se hace otro juego o efecto de partículas.

## Notas para implementar en conjunto

- **gsap eliminado**: el único uso era el encogido suave del enemigo; se cubre con
  `lerp` hacia `radioObjetivo`. No se añadió ninguna dependencia nueva al proyecto.
- **Mouse**: `P5Sketch.tsx` monta a tamaño lógico y escala por `transform`, y p5
  mapea `mouseX/mouseY` a coords del canvas automáticamente, así que el apuntado
  funciona aunque la pieza se escale en pantallas chicas.
- **Tamaño fijo 800×600** en vez de pantalla completa: el jugador queda en el
  centro y los enemigos surgen de los bordes de ese lienzo.
- **Reuso descartado a propósito**: la `ParticulaExplosion` (fricción + fade) no
  reutiliza `bibliotecas/particula.ts` (partícula de espiral, wrap toroidal): son
  comportamientos distintos y forzar el reuso habría distorsionado ambas.
- **Verificación**: `npx tsc --noEmit` pasa limpio (exit 0). `next lint` sigue sin
  configurarse en el proyecto (no se inicializó).
- Posible mejora futura: dificultad progresiva (bajar `INTERVALO_SPAWN` con el
  score) y sonidos (requeriría `needsAudio` + p5.sound).
