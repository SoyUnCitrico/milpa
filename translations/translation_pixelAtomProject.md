# translation_pixelAtomProject.md

Notas de migración de **`pixelAtomProject`** (sketch de **Processing/Java**, 17
`.pde`) a la galería `MILPA` como pieza p5 en modo instancia (slug
`atomos-pixel`). Es el port más grande del repo: no es conversión mecánica
global→instancia sino una **reescritura Java → TypeScript** que conserva la
arquitectura y el comportamiento del original, con optimizaciones de render.
Owner de GitHub: `SoyUnCitrico` (default; no hizo falta tocar `config.ts`).

## Qué quedó fuera (a propósito)

- **OSC (`OscController.pde`)** — requería un servidor local/UDP; no existe en
  el navegador. El `InteractionController` se conserva como única capa de
  comandos (teclado + botones táctiles). Los parámetros que SOLO eran
  accesibles por OSC (`/charsizedark`, `/colonize/attraction|kill|seg`, `/text`
  en vivo) quedan como campos de `AjustesRender`/`ContextoAtomos` con sus
  defaults; el texto ASCII se fija en la pantalla de configuración.
- El modo debug de wander (`drawWander`/`toogleDebug`) — inalcanzable desde el
  teclado en el original.
- `crecer()`/`mapLifeToColor()` — sin llamadas en el original.

## Archivos

- `lib/bibliotecas/atomosPixel/` — módulo dedicado (patrón `juegoEspacial/`):
  - `tipos.ts` (union types + `MODOS` + **`ContextoAtomos`**), `colorUtil.ts`
    (HSB↔RGB a mano, `mapear`, `acotar`), `configuracion.ts` (localStorage),
    `estadoApp.ts`, `ajustesRender.ts`, `atomoPixel.ts`, `clusterPixel.ts`,
    `campoFlujo.ts`, `composicionPixel.ts`, `colonizacion.ts`, `repulsor.ts`,
    `animaciones.ts`, `controlInteraccion.ts`, `fuenteImagen.ts`,
    `pantallaConfig.ts`, `index.ts` (barrel).
- `lib/sketches/atomosPixel.ts` — factory orquestadora (≈ `pixelAtomProject.pde`).
- `components/P5Sketch.tsx` — dos cambios **genéricos** del wrapper:
  1. el cleanup detiene los `MediaStreamTrack` de cualquier `<video>` del
     contenedor antes de `remove()` (p5 no apaga la cámara);
  2. adopta las dimensiones reales del canvas si difieren del meta (permite el
     canvas retrato en móvil). No-op para las piezas existentes.
- `scripts/sync-originals.mjs` — si el `source` es el `.pde` principal de un
  sketch de Processing, concatena TODOS los `.pde` de la carpeta (principal
  primero) en `originals/<source>`.

## Decisiones estructurales del port

| Original (Processing/Java) | Port p5 (TS, instancia) |
|---|---|
| Globales del sketch (`state`, `render`, `img`, `cluster`, `campo`, `composer`, `colonizer`, `repulsors`, `width/height`) | **`ContextoAtomos`**: objeto contexto que la factory crea y pasa a todas las clases |
| Enums Java (`AnimationMode`, `ParticleShape`, `BackgroundMode`) + strings de límites | union types + tabla `MODOS as const` (tecla + etiqueta) |
| `PVector` | `{x, y}` planos; el steering es aritmética escalar (ver rendimiento) |
| `color` (int empaquetado) + `hue()/saturation()/brightness()` | canales `r,g,b,a` numéricos + `rgbAHsb`/`hsbARgb` propios (misma escala 0..255 que Processing) |
| `Capture` (processing.video) + GUI controlP5 | `createCapture` con `deviceId` + pantalla de config con DOM de p5 (`createSelect/Input/Button` + textarea) |
| `config.json` (`sketchPath`) | `localStorage` (`milpa:atomos-pixel:config`) |
| `selectInput()` (diálogo Swing, hilo aparte) | `createFileInput` oculto + `loadImage(dataURL)` (tecla `l`) |
| `captureCanvas()` (copia de `pixels[]`) | `p.get()` con `pixelDensity(1)` (framebuffer lógico exacto, espejo incluido) |
| `PFont Monospaced` / `Monospaced.bold` | familia CSS `"monospace"` + `p.textStyle(BOLD)` |
| `size(1280,720)` fijo | 1280×720 en apaisado; **540×960 en retrato (móvil)**; el wrapper escala |
| Teclado solamente | teclado completo + 5 botones táctiles (capturar, modo, forma, explosión, play) que llaman a los mismos comandos |

## Optimizaciones de render (misma imagen, menos trabajo)

1. **`pixelDensity(1)`** — sin esto, en pantallas retina el fill-rate se
   cuadruplica.
2. **Steering sin allocaciones**: `seek/arrive/wander/flock/attract/orbit/
   followField` reescritos con escalares sobre `.x/.y` (el original creaba
   3–10 `PVector` por partícula y frame; el GC de JS lo castiga más). El flock
   además hace **una sola pasada** sobre los vecinos (el original recorría la
   lista 3 veces) con distancias al cuadrado.
3. **Estado de p5 por frame, no por partícula** (`iniciarFrame/terminarFrame`
   en `ClusterPixel`): tipografía de CHAR, `colorMode(HSB)` de HUECYCLE y
   `noStroke` se fijan una vez por frame.
4. **Sin `push/translate/rotate` por partícula**: LINE precomputa `cos/sin`
   (su ángulo depende solo de la saturación del píxel) y RECT las 4 esquinas
   rotadas (`p.quad`). Lo mismo en las composiciones del `ComposerPixel`.
5. **COLONIZE** (cuello del original: `grow()` era O(atractores × nodos) y
   `draw()` redibujaba toda la red): grilla espacial de nodos (celda =
   `attractionDist`, actualización incremental — los nodos no se mueven) y
   **dibujo incremental en un `p5.Graphics`** (solo los segmentos/píxeles
   nuevos) + un único `image()` por frame.
   ⚠ Diferencia visible asumida: con fondo TRAILS/PERSIST la red ya no se
   acumula con el velo (con CLEAR, el default del modo, es idéntico).
6. **Tope de seguridad de partículas**: `cellSizeEfectivo` eleva el cellSize si
   una config manual supera `MAX_PARTICULAS` (8000) / `MAX_FLOCK` (2500). Con
   los defaults (12/24) no recorta nada: 1280×720/12² ≈ 6400 partículas
   (desktop) y 540×960/12² ≈ 3600 (móvil).
7. **Atlas de glifos para CHAR** (`atlasGlifos.ts`): `fillText` ×6400 era el
   único modo bajo 30 fps; cada (letra, tamaño cuantizado a 2px, negrita,
   color) se rasteriza una vez a un canvas pequeño y se pinta con `drawImage`
   + `globalAlpha`. Medido con Playwright en Intel Iris Xe: 59 fps con atlas
   vs 28 fps con fillText. El modo "color del píxel" (cada letra de un color)
   no puede usar atlas y conserva el fillText; los glifos " " se saltan.
8. Menores: buckets/vecinos del flock reutilizados, `lookup()` del campo sin
   copia, lectura del array plano `img.pixels` (RGBA) al construir, sin
   `println` en hot paths.

## Fixes respecto al original (documentados)

- `checkLimits("REVERSE_Y")` comparaba `position.y > width` (typo heredado);
  aquí compara con `height`. Ningún modo usa REVERSE_Y, así que no cambia nada
  visible.
- `type.toUpperCase()` sin efecto (strings inmutables en Java) — innecesario
  con union types.
- La grafía `toogle*` del original se normalizó a `toggle*` (codebase TS nueva,
  sin mezcla de grafías).

## Notas para la galería

- **Cámara**: la pieza arranca en la pantalla de configuración; el permiso se
  pide con el botón "Buscar cámaras" (getUserMedia efímero para poblar los
  labels de `enumerateDevices`) o al Iniciar. Al capturar (`t`) la cámara se
  APAGA (como el original detenía `Capture`) y se re-enciende al volver a la
  vista previa. Si no hay cámara/permiso, la opción "sin cámara" pide una
  imagen de archivo: la pieza sigue siendo usable.
- **Teclado**: `p.keyPressed` devuelve `false` solo para espacio/flechas (evita
  el scroll de la página); escribiendo en inputs/textarea no se procesan
  atajos. En esta pieza `s` **cicla la forma** (no guarda PNG como en otras).
- **Selector de cámara**: los labels de `enumerateDevices` llegan vacíos sin
  permiso, y el repoblado async NO debe "conservar" el placeholder: la
  prioridad es elección manual del usuario > `config.cameraId` guardado >
  primera cámara. (Bug encontrado y corregido en la verificación e2e.)
- **Botones táctiles a la DERECHA del canvas**: la barra lateral fija de la
  galería solapa la franja izquierda del canvas en pantallas medianas.
- **iOS Safari**: `getUserMedia` exige HTTPS (en dev, localhost vale).
- **Verificación**: `npx tsc --noEmit` limpio; `npm run gen:originals` 35/35
  (el `.pde` vendorizado concatena los 17 archivos); `npm run build` OK.
  E2E con Playwright + cámara falsa de Chromium (GPU D3D11): flujo completo
  config→permiso→preview→captura→modos; 59-60 fps en ORIGINAL/FLOCK/CHAR/
  HUECYCLE+TRAILS/COLONIZE con ~6400 partículas a 1280×720; la cámara se apaga
  al capturar y al navegar a otra pieza (cleanup del wrapper); retrato 540×960
  adoptado por el wrapper; config persistida en localStorage tras recargar.
  ⚠ Nota: en renderers de SOFTWARE (SwiftShader/VMs sin GPU) el atlas rinde
  peor que fillText (~17 fps); con cualquier GPU real gana con claridad.
