# translation_Talleres2021-CC1.md

Notas de migración de sketches del taller **`Talleres2021-CC1`** ("Introducción al
Código Creativo", de la org **ccdtecno**) a la galería `MILPA`.

## Piezas portadas (4)

| Original | Factory nueva | slug |
|---|---|---|
| `Ejemplos/CC1_ejemplo3_mousePaint.js` | `lib/sketches/mousePaint.ts` | `mouse-paint` |
| `script/CC1_taller4_Movbolita_loopAnidado.js` | `lib/sketches/rejillaMovimiento.ts` | `rejilla-movimiento` |
| `Ejemplos/CC1_ejemplo4_Movbolita_loopAnidado_aros.js` | `lib/sketches/arosPulsantes.ts` | `aros-pulsantes` |
| `Ejemplos/CC1_ejemplo2.5._Bolita_vectores_Muchos.js` | `lib/sketches/bolitasVectores.ts` | `bolitas-vectores` |

Registradas en `lib/sketches/index.ts` con `author: "ccdtecno"`. Originales
vendorizados en `originals/Talleres2021-CC1/...` (`npm run gen:originals`, 22/22
sources).

## Cambios más importantes del port

- **Conversión global → instancia** (idéntica a los ports previos): globales de
  módulo a variables de clausura; API de p5 prefijada con `p.`
  (`createCanvas`, `background`, `colorMode(p.HSB)`, `random`, `noise`, `fill`,
  `ellipse`, `rect`, `createVector`, `color`, `keyCode`, `mouseX/Y`,
  `mouseIsPressed`); **eliminado `.parent("sketch-container")`** (el wrapper monta
  el canvas). Nombres y subrutinas en español conservados.
- `rejillaMovimiento`: el original usaba los globales p5 `width`/`height` dentro del
  bucle → ahora `p.width`/`p.height`. Se mantuvo `Math.cos/Math.sin` tal cual.
- `bolitasVectores`: las subrutinas `dibujaBolita/mueveBolitas/frontera/
  dibujarFrontera` quedaron como funciones internas que cierran sobre `p`; el
  `keyPressed = () => {...}` global del original (toggle con `keyCode === 32`) pasó
  a `p.keyPressed`. Tipado estricto de los `p5.Vector`/`p5.Color`.
- `mousePaint`: pieza acumulativa (no limpia el fondo); callbacks
  `p.mousePressed/mouseReleased/mouseDragged` + `p.mouseIsPressed` en `draw`.

## Owner de GitHub (cambio en `config.ts`)

Primer repo del monorepo cuyo owner **no** es `SoyUnCitrico`: `Talleres2021-CC1` es
de **`ccdtecno`**. Se extendió `lib/config.ts` de forma aditiva con un mapa
`OWNER_POR_REPO` (default sigue siendo `SoyUnCitrico`), de modo que `sourceUrl()`
arma `https://github.com/ccdtecno/Talleres2021-CC1/blob/HEAD/<ruta>` solo para este
repo. No se necesitó el fallback "enlace a la misma página": los 4 sketches sí
tienen repo upstream. El cambio no afecta a las piezas ya portadas.

## Código más relevante encontrado / hallazgos del inventario

- **Ninguno de los 20 sketches del taller usa realmente las clases de
  `assets/js/scripts/libraries/`** (`Bolita`, `GridBolitas`, `FlowField`,
  `Neuron`): cada sketch define sus propias funciones locales. Por eso **no se
  portó ninguna biblioteca** ni hubo riesgo de duplicar código. (Esas clases —
  sobre todo `Bolita` con steering seguir/huir/arrive/followField, y `FlowField`
  `{v, origin}` — quedan como referencia si en el futuro se quiere una biblioteca
  de campos/steering en la galería; hoy la galería no tiene `Flowfield`.)
- `libraries/neuron.js` es una clase **WEBGL 3D** que depende de muchos globales
  externos no definidos en el archivo (`neurons[]`, `dM`, `k`, `d(...)`...): no es
  autocontenida, se descartó.

## Sketches descartados (16) y por qué

- **Estáticos / triviales de taller:** `ejemplo1_cuadradoCirculos`,
  `ejemplo1_fondoFigura`, `ejemplo1_tonosGris`, `CC_taller1_Basicos` (catálogo de
  primitivas), `taller2.1_posicionYMovimiento`, `taller2.2`, `taller3_MouseElse`,
  `taller4_while`.
- **Near-duplicados didácticos (se conservó la mejor variante):** la familia "una
  bolita" (`ejemplo2_BolitaBasico`, `ejemplo2_BolitaFronteraBasico`,
  `ejemplo2.5_Bolita_vectores`, `taller4_baseMovbolita`, `taller4_MultipleMovbolita`)
  → cubierta por `bolitas-vectores`. La rejilla `taller4_Movbolita_loopAnidado` y
  `ejemplo4_aros` son hermanas pero suficientemente distintas (campo con rastro vs.
  aros pulsantes), así que se portaron ambas.
- **Borderline tipográfico/interacción:** `taller3_keyIF` ("máquina de escribir"),
  `taller2.3_tiposDeMovimiento` (demo Perlin vs random vs lineal),
  `ejemplo3_Bolita_mouseInt` ("viento" al presionar). Quedan disponibles si se
  quieren sumar después.

## Notas para implementar en conjunto

- Los 10 archivos "instancia" del taller (`export default function sketch(p5){...}`)
  no entraron en esta tanda; si se retoman, su `p5` ya es el objeto de instancia
  (renombrar a `p` y tiparlo).
- **Verificación**: `npx tsc --noEmit` exit 0; `npm run build` genera 27 páginas
  estáticas (incluidas las 4 nuevas). `next lint` sigue sin configurarse en el
  proyecto.
