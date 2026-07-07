# translation_p5_works.md

Notas de migración de sketches de la carpeta legacy **`p5_works`** a la galería
`MILPA` (TypeScript + modo instancia de p5). Owner de GitHub: `SoyUnCitrico`
(default; no hizo falta tocar `config.ts` ni el fallback de UI porque las cuatro
piezas tienen `source` real en ese repo).

## Piezas portadas en esta corrida

| Sketch original | Factory nueva | slug | Reutiliza |
|---|---|---|---|
| `sketches/spiralGira.js` | `lib/sketches/spiralGira.ts` | `spiral-gira` | `bibliotecas/spiral` |
| `sketches/girasol.js` | `lib/sketches/girasol.ts` | `girasol` | `bibliotecas/spiral` |
| `sketches/generativo.js` | `lib/sketches/generativo.ts` | `generativo` | — (autónomo) |
| `sketches/generativoParticulas.js` | `lib/sketches/generativoParticulas.ts` | `generativo-particulas` | `bibliotecas/particula` (extendida) |

Cada una se registró en `lib/sketches/index.ts` y su `.js` original se vendorizó en
`originals/p5_works/sketches/` vía `npm run gen:originals` (17/17 sources copiados).

## Cambios más importantes del port

### Comunes (global → instancia)
- Globales de módulo movidos a variables de clausura dentro de cada factory
  `(p) => { ... }`; toda la API de p5 prefijada con `p.`.
- Eliminado `.parent('mainContainer')` (el wrapper monta el canvas pasando el nodo).
- Subrutinas en español conservadas como funciones internas (`maze`, `grid`,
  `spin`).
- Nombres y comentarios en español mantenidos por convención del repo.

### spiralGira
- Reutiliza la biblioteca `Spiral` ya portada (igual que `spiralOne`). Sólo se
  antepone `p` al constructor; los métodos usados (`update`, `draw`,
  `setOffsetAngle`, `setRadioInt/Ext`, `getRadioInterior/Exterior`, `setCicles`)
  ya existen.
- Se eliminaron los `keyPressed` del original: sólo contenían llamadas comentadas
  a `saveFrames`, así que la pieza es autónoma.

### girasol
- **Decisión de no duplicar:** el original armaba cada espiral con una función
  local `setSpiral(...)` que instanciaba `Particle`s a mano. Se reemplazó por la
  biblioteca `Spiral` (misma colocación polar), mapeando el orden de argumentos
  `setSpiral(ciclos, radioInt, radioExt, stepsRadio, total, ...)` →
  `new Spiral(p, total, ciclos, radioInt, radioExt, stepsRadio, ...)`.
- **Diferencia visual menor a vigilar:** el `.js` original pasaba el `angle` como
  6º argumento de `Particle` (que en la clase es `particleStrokeColor`, no el
  ángulo), dejando todas las partículas con rotación 0. Al usar `Spiral`, cada
  partícula sí se rota por su ángulo polar, por lo que los cuadrados quedan
  orientados radialmente. Es más coherente con `spiralOne`/`spiralGira`, pero el
  resultado no es pixel-idéntico al original.
- La animación estaba comentada en el original (sólo `show()`); la pieza dibuja
  una vez y se detiene con `noLoop()`.

### generativo
- Autónomo, sin bibliotecas. Se conservaron dos rarezas del original a propósito:
  `draw()` no limpia el fondo (las líneas del "maze" se acumulan) y `grid()` aplica
  `rotate(PI)` sin `push()/pop()`, por lo que la matriz gira de forma acumulada.
- `windowWidth/windowHeight` → `p.windowWidth/p.windowHeight` (la cuadrícula se
  calcula sobre el tamaño de ventana, no del canvas; sólo se ve lo que cae dentro
  de 600×600).
- Quitado el trailing comma de `ellipse(i, j, 20, 10,)`.

### generativoParticulas
- **Decisión del usuario: extender la biblioteca compartida `particula.ts`**
  (en vez de dejar una clase privada). La extensión es **puramente aditiva** para
  no romper las piezas de espirales que ya la usan:
  - Nuevo tipo de dibujo `"estela"` en `show()` con *early return*: traza una línea
    coloreada entre `pos` y `prevPos` en coordenadas absolutas (sin
    `translate/rotate`), usando `r/g/b/alpha`.
  - Nuevo método `derivaColor()`: desvanecido (`alpha -= 0.08`) + deriva de tono.
  - Nuevo método `rebote()`: invierte la velocidad en los bordes (alternativa a
    `edges()`, que hace wrap toroidal).
- El campo de flujo se calcula **inline** como arreglo de vectores; **no** se
  necesitó una clase `Flowfield`.
- Se reemplazó `p5.Vector.fromAngle(a)` por `createVector(cos(a), sin(a))` para no
  depender del constructor de p5 inyectado.
- **Guarda añadida:** se verifica `if (force)` antes de aplicar la fuerza del
  campo, porque la partícula puede salirse del lienzo un instante antes de rebotar
  y el índice quedaría fuera de rango (`flowfield[index]` undefined). El original
  no lo hacía y era un crash latente.

## Código más relevante encontrado

- **`bibliotecas/spiral.ts` + `bibliotecas/particula.ts`** son el núcleo
  reutilizable de las piezas de espirales/partículas de `p5_works`. `spiralGira` y
  `girasol` se apoyan enteramente en `Spiral`; conviene seguir portando piezas de
  espirales sobre esta misma base.
- El patrón "flow field Perlin" de `generativoParticulas` (Coding Train) es el
  candidato natural si en el futuro se quiere una biblioteca `Flowfield` propia en
  la galería (hoy no existe; `testSpiral.js` también la pediría).

## Notas para implementar en conjunto

- **No portado (descartado en la curación):** `primeraSesion.js` (scaffolding DOM
  de taller, p5 incompleto), `segundaSesion.js` (elipse rebotando trivial),
  `collagep5.js` / `fotos.js` / `emojis-analizer.js` / `emojis-images.js` (dependen
  de imágenes/datos externos `/data/collage/*.png`, emojis y libs `gd`/`kdTree`),
  `testSpiral.js` (controles vía inputs DOM `#info` + necesita `Flowfield`).
  Si se retoman, los asset-dependientes requieren copiar los binarios a `public/`.
- **Extensión de `particula.ts`:** cualquier cambio futuro a `show()`/`update()` de
  esa clase debe respetar que `spiralOne`, `spiralGira` y `girasol` dependen de su
  comportamiento actual (fill + figuras + wrap). Los métodos `derivaColor`/`rebote`
  y el tipo `"estela"` son opt-in y sólo los usa `generativoParticulas`.
- **Tamaños de canvas grandes:** `girasol` es 1254×1254 y `spiralGira` 1080×1080;
  el wrapper los escala por CSS, pero son piezas pesadas en cómputo (muchas
  partículas). `girasol` mitiga con `noLoop()`.
- **Verificación:** `npx tsc --noEmit` pasa limpio (exit 0). `next lint` no está
  configurado en el proyecto (pide setup interactivo); no se inicializó.
